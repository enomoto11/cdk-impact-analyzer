import * as fs from 'node:fs';
import * as path from 'node:path';

export type CdkProjectDetection =
  | { isCdkProject: true; cdkJsonPath: string }
  | { isCdkProject: false; reason: string };

export function detectCdkProject(projectPath: string): CdkProjectDetection {
  const cdkJsonPath = path.join(projectPath, 'cdk.json');
  if (!fs.existsSync(cdkJsonPath)) {
    return { isCdkProject: false, reason: 'cdk.json not found at project root' };
  }
  try {
    const raw = fs.readFileSync(cdkJsonPath, 'utf8');
    JSON.parse(raw);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { isCdkProject: false, reason: `cdk.json is not valid JSON: ${message}` };
  }
  return { isCdkProject: true, cdkJsonPath };
}
