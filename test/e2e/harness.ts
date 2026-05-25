import * as path from 'node:path';

import { analyze, type AnalyzeResult, type ChangedFile } from '../../src/analyzer';

const PROJECT_ROOT = path.resolve(process.cwd());

export interface E2eOptions {
  changedLineRanges?: Record<string, ChangedFile['changedLineRanges']>;
}

export async function runE2e(
  projectPath: string,
  changedRelativeFiles: string[],
  options: E2eOptions = {},
): Promise<AnalyzeResult> {
  const absoluteProjectPath = path.isAbsolute(projectPath)
    ? projectPath
    : path.resolve(PROJECT_ROOT, projectPath);
  const tsconfigPath = path.join(absoluteProjectPath, 'tsconfig.json');

  const changes: ChangedFile[] = changedRelativeFiles.map((rel) => ({
    path: path.join(absoluteProjectPath, rel),
    changedLineRanges: options.changedLineRanges?.[rel],
  }));

  return analyze({ projectPath: absoluteProjectPath, tsconfigPath, changes });
}

export const SYNTHETIC_FIXTURES = path.resolve(PROJECT_ROOT, 'test/fixtures');
export const AWS_CDK_EXAMPLES_TS = path.resolve(
  PROJECT_ROOT,
  '.e2e-cache/aws-cdk-examples/typescript',
);

export const syntheticFixture = (name: string): string =>
  path.join(SYNTHETIC_FIXTURES, name);

export const awsCdkExamplesFixture = (name: string): string =>
  path.join(AWS_CDK_EXAMPLES_TS, name);
