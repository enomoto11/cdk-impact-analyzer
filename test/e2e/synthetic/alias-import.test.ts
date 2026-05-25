import * as fs from 'node:fs';
import * as path from 'node:path';

import { describe, expect, it } from 'vitest';

import { runE2e, syntheticFixture } from '../harness';

const projectPath = syntheticFixture('alias-import');

describe('e2e/synthetic/alias-import', () => {
  it('fixture project is well-formed', () => {
    expect(fs.existsSync(path.join(projectPath, 'cdk.json'))).toBe(true);
    expect(fs.existsSync(path.join(projectPath, 'lib/aliased-stack.ts'))).toBe(true);
  });

  it('detects stack extending an alias-imported Stack', async () => {
    const result = await runE2e(projectPath, ['lib/aliased-stack.ts']);
    expect(result.affectedStacks).toEqual(['AliasedStack']);
  });

  it('change to bin/app.ts → [AliasedStack] (instantiation site)', async () => {
    const result = await runE2e(projectPath, ['bin/app.ts']);
    expect(result.affectedStacks).toEqual(['AliasedStack']);
  });
});
