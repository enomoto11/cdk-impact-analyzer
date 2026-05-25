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

export async function analyze(_input: AnalyzeInput): Promise<AnalyzeResult> {
  return { affectedStacks: [], traces: [] };
}
