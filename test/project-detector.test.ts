import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';

import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { detectCdkProject } from '../src/project-detector';

describe('detectCdkProject', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cdk-impact-analyzer-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('returns false when cdk.json is missing', () => {
    const result = detectCdkProject(tmpDir);
    expect(result.isCdkProject).toBe(false);
    if (!result.isCdkProject) {
      expect(result.reason).toContain('cdk.json not found');
    }
  });

  it('returns false when cdk.json is invalid JSON', () => {
    fs.writeFileSync(path.join(tmpDir, 'cdk.json'), '{ not json');
    const result = detectCdkProject(tmpDir);
    expect(result.isCdkProject).toBe(false);
    if (!result.isCdkProject) {
      expect(result.reason).toContain('not valid JSON');
    }
  });

  it('returns true with cdkJsonPath when cdk.json is valid', () => {
    const cdkJsonPath = path.join(tmpDir, 'cdk.json');
    fs.writeFileSync(cdkJsonPath, JSON.stringify({ app: 'npx ts-node bin/app.ts' }));
    const result = detectCdkProject(tmpDir);
    expect(result.isCdkProject).toBe(true);
    if (result.isCdkProject) {
      expect(result.cdkJsonPath).toBe(cdkJsonPath);
    }
  });
});
