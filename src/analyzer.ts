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
  site: Node;
  siteFile: string;
}

export async function analyze(input: AnalyzeInput): Promise<AnalyzeResult> {
  const project = new Project({ tsConfigFilePath: input.tsconfigPath });

  const changedFilesByPath = new Map<string, ChangedFile>();
  for (const c of input.changes) {
    changedFilesByPath.set(path.resolve(c.path), c);
  }

  const instantiations = findStackInstantiations(project);
  const closureMemo = new Map<ClassDeclaration, Set<Node>>();
  const stackToReachedFrom = new Map<string, Set<string>>();

  for (const inst of instantiations) {
    const reachedFrom = new Set<string>();

    const siteCf = changedFilesByPath.get(inst.siteFile);
    if (siteCf && overlapsRanges(inst.site, siteCf.changedLineRanges)) {
      reachedFrom.add(inst.siteFile);
    }

    for (const decl of closureOf(inst.classDecl, closureMemo)) {
      const declFile = path.resolve(decl.getSourceFile().getFilePath());
      const cf = changedFilesByPath.get(declFile);
      if (!cf) continue;
      if (!overlapsRanges(decl, cf.changedLineRanges)) continue;
      reachedFrom.add(declFile);
    }

    if (reachedFrom.size === 0) continue;
    let acc = stackToReachedFrom.get(inst.id);
    if (!acc) {
      acc = new Set();
      stackToReachedFrom.set(inst.id, acc);
    }
    for (const f of reachedFrom) acc.add(f);
  }

  const affectedStacks = Array.from(stackToReachedFrom.keys()).sort();
  const traces: StackTrace[] = affectedStacks.map((id) => ({
    stackName: id,
    reachedFrom: Array.from(stackToReachedFrom.get(id) ?? new Set<string>()).sort(),
  }));

  return { affectedStacks, traces };
}

function overlapsRanges(node: Node, ranges: ChangedLineRange[] | undefined): boolean {
  if (!ranges) return true;
  const start = node.getStartLineNumber();
  const end = node.getEndLineNumber();
  for (const r of ranges) {
    if (start < r.endLineExclusive && end >= r.startLine) return true;
  }
  return false;
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
        site: node,
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

function closureOf(
  classDecl: ClassDeclaration,
  memo: Map<ClassDeclaration, Set<Node>>,
): Set<Node> {
  const cached = memo.get(classDecl);
  if (cached) return cached;
  const result = new Set<Node>([classDecl]);
  memo.set(classDecl, result);

  const queue: Node[] = [classDecl];
  const visited = new Set<Node>([classDecl]);

  while (queue.length > 0) {
    const current = queue.shift()!;

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
        result.add(topDecl);
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
