import * as path from 'node:path';

import {
  ClassDeclaration,
  Node,
  Project,
  SourceFile,
  SyntaxKind,
  type Symbol as TsMorphSymbol,
} from 'ts-morph';

export interface ChangedLineRange {
  startLine: number;
  endLineExclusive: number;
}

export interface ChangedFile {
  path: string;
  changedLineRanges?: ChangedLineRange[];
}

export interface AnalyzeInput {
  projectPath: string;
  tsconfigPath: string;
  changes: ChangedFile[];
}

export interface StackTrace {
  stackName: string;
  reachedFrom: string[];
}

export interface AnalyzeResult {
  affectedStacks: string[];
  traces: StackTrace[];
}

interface StackInstantiation {
  id: string;
  classDecl: ClassDeclaration;
  siteFile: string;
}

export async function analyze(input: AnalyzeInput): Promise<AnalyzeResult> {
  const project = new Project({ tsConfigFilePath: input.tsconfigPath });

  const changedFilePaths = new Set(input.changes.map((c) => path.resolve(c.path)));
  const instantiations = findStackInstantiations(project);

  const closureMemo = new Map<ClassDeclaration, Set<string>>();
  const stackToReachedFrom = new Map<string, Set<string>>();

  for (const inst of instantiations) {
    const affecting = computeAffectingFiles(inst, closureMemo);
    for (const changedPath of changedFilePaths) {
      if (!affecting.has(changedPath)) continue;
      let reached = stackToReachedFrom.get(inst.id);
      if (!reached) {
        reached = new Set();
        stackToReachedFrom.set(inst.id, reached);
      }
      reached.add(changedPath);
    }
  }

  const affectedStacks = Array.from(stackToReachedFrom.keys()).sort();
  const traces: StackTrace[] = affectedStacks.map((id) => ({
    stackName: id,
    reachedFrom: Array.from(stackToReachedFrom.get(id) ?? new Set<string>()).sort(),
  }));

  return { affectedStacks, traces };
}

function findStackInstantiations(project: Project): StackInstantiation[] {
  const out: StackInstantiation[] = [];
  for (const sf of project.getSourceFiles()) {
    if (isExternal(sf)) continue;
    sf.forEachDescendant((node) => {
      if (!Node.isNewExpression(node)) return;
      const classDecl = resolveClassDeclaration(node.getExpression());
      if (!classDecl) return;
      if (!isStackSubclass(classDecl, new Set())) return;
      const args = node.getArguments();
      const idArg = args[1];
      if (!idArg || !Node.isStringLiteral(idArg)) return;
      out.push({
        id: idArg.getLiteralText(),
        classDecl,
        siteFile: path.resolve(sf.getFilePath()),
      });
    });
  }
  return out;
}

function resolveClassDeclaration(expr: Node): ClassDeclaration | undefined {
  const sym = expr.getSymbol();
  if (!sym) return undefined;
  for (const d of followAliases(sym).getDeclarations()) {
    if (d.getKind() === SyntaxKind.ClassDeclaration) return d as ClassDeclaration;
  }
  return undefined;
}

function followAliases(sym: TsMorphSymbol): TsMorphSymbol {
  let current = sym;
  for (let i = 0; i < 10; i++) {
    const aliased = current.getAliasedSymbol();
    if (!aliased) return current;
    current = aliased;
  }
  return current;
}

function isStackSubclass(decl: ClassDeclaration, visited: Set<ClassDeclaration>): boolean {
  if (visited.has(decl)) return false;
  visited.add(decl);

  const heritage = decl.getExtends();
  if (!heritage) return false;

  const expr = heritage.getExpression();
  const text = expr.getText();

  if (text === 'Stack') return true;
  if (text.endsWith('.Stack')) return true;

  const sym = expr.getSymbol();
  if (sym) {
    for (const d of followAliases(sym).getDeclarations()) {
      if (d.getKind() === SyntaxKind.ClassDeclaration) {
        if (isStackSubclass(d as ClassDeclaration, visited)) return true;
      }
    }
  }
  return false;
}

function computeAffectingFiles(
  inst: StackInstantiation,
  memo: Map<ClassDeclaration, Set<string>>,
): Set<string> {
  const result = new Set<string>();
  result.add(inst.siteFile);
  for (const f of closureOf(inst.classDecl, memo)) result.add(f);
  return result;
}

function closureOf(
  classDecl: ClassDeclaration,
  memo: Map<ClassDeclaration, Set<string>>,
): Set<string> {
  const cached = memo.get(classDecl);
  if (cached) return cached;
  const result = new Set<string>();
  memo.set(classDecl, result);

  const queue: Node[] = [classDecl];
  const visited = new Set<Node>([classDecl]);

  while (queue.length > 0) {
    const current = queue.shift()!;
    const sf = current.getSourceFile();
    if (!isExternal(sf)) result.add(path.resolve(sf.getFilePath()));

    current.forEachDescendant((d) => {
      if (!Node.isIdentifier(d)) return;
      const sym = d.getSymbol();
      if (!sym) return;
      for (const target of followAliases(sym).getDeclarations()) {
        if (visited.has(target)) continue;
        if (isExternal(target.getSourceFile())) continue;
        if (isImportLike(target)) continue;
        const topDecl = getTopLevelEnclosingDeclaration(target);
        if (!topDecl) continue;
        if (visited.has(topDecl)) continue;
        visited.add(topDecl);
        queue.push(topDecl);
      }
    });
  }

  return result;
}

function isExternal(sf: SourceFile): boolean {
  if (sf.getFilePath().includes('/node_modules/')) return true;
  if (sf.isDeclarationFile()) return true;
  return false;
}

function isImportLike(d: Node): boolean {
  return (
    Node.isImportSpecifier(d) ||
    Node.isImportClause(d) ||
    Node.isNamespaceImport(d) ||
    Node.isImportEqualsDeclaration(d)
  );
}

function getTopLevelEnclosingDeclaration(d: Node): Node | undefined {
  let current: Node | undefined = d;
  while (current) {
    const parent: Node | undefined = current.getParent();
    if (!parent) return undefined;
    if (Node.isSourceFile(parent)) {
      if (
        Node.isClassDeclaration(current) ||
        Node.isFunctionDeclaration(current) ||
        Node.isVariableStatement(current) ||
        Node.isInterfaceDeclaration(current) ||
        Node.isTypeAliasDeclaration(current) ||
        Node.isEnumDeclaration(current) ||
        Node.isModuleDeclaration(current)
      ) {
        return current;
      }
      return undefined;
    }
    current = parent;
  }
  return undefined;
}
