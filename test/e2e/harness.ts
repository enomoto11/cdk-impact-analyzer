import * as path from 'node:path';

import { analyze, type AnalyzeResult, type ChangedFile } from '../../src/analyzer';

const FIXTURES_ROOT = path.resolve(process.cwd(), 'test/fixtures');

export interface E2eOptions {
  changedLineRanges?: Record<string, ChangedFile['changedLineRanges']>;
}

export async function runE2e(
  fixtureName: string,
  changedRelativeFiles: string[],
  options: E2eOptions = {},
): Promise<AnalyzeResult> {
  const projectPath = path.join(FIXTURES_ROOT, fixtureName);
  const tsconfigPath = path.join(projectPath, 'tsconfig.json');

  const changes: ChangedFile[] = changedRelativeFiles.map((rel) => ({
    path: path.join(projectPath, rel),
    changedLineRanges: options.changedLineRanges?.[rel],
  }));

  return analyze({ projectPath, tsconfigPath, changes });
}

export const fixturePath = (fixtureName: string, relative = ''): string =>
  relative ? path.join(FIXTURES_ROOT, fixtureName, relative) : path.join(FIXTURES_ROOT, fixtureName);
