import * as fs from 'node:fs';
import * as path from 'node:path';

import { describe, expect, it } from 'vitest';

import { runE2e, syntheticFixture } from '../harness';

const projectPath = syntheticFixture('multi-stack-basic');

describe('e2e/synthetic/multi-stack-basic', () => {
  it('fixture project is well-formed', () => {
    expect(fs.existsSync(path.join(projectPath, 'cdk.json'))).toBe(true);
    expect(fs.existsSync(path.join(projectPath, 'tsconfig.json'))).toBe(true);
    expect(fs.existsSync(path.join(projectPath, 'bin/app.ts'))).toBe(true);
    expect(fs.existsSync(path.join(projectPath, 'lib/shared-table.ts'))).toBe(true);
    expect(fs.existsSync(path.join(projectPath, 'lib/orphan.ts'))).toBe(true);
  });

  it('returns an empty result with no changes', async () => {
    const result = await runE2e(projectPath, []);
    expect(result.affectedStacks).toEqual([]);
    expect(result.traces).toEqual([]);
  });

  it('change to lib/shared-table.ts → [ApiStack, WorkerStack] (shared construct → multiple stacks)', async () => {
    const result = await runE2e(projectPath, ['lib/shared-table.ts']);
    expect(result.affectedStacks).toEqual(['ApiStack', 'WorkerStack']);
    expect(result.traces.map((t) => t.stackName)).toEqual(['ApiStack', 'WorkerStack']);
    const sharedTable = path.join(projectPath, 'lib/shared-table.ts');
    for (const trace of result.traces) {
      expect(trace.reachedFrom).toContain(sharedTable);
    }
  });

  it('change to lib/api-only-helper.ts → [ApiStack] (leaf reached by one stack)', async () => {
    const result = await runE2e(projectPath, ['lib/api-only-helper.ts']);
    expect(result.affectedStacks).toEqual(['ApiStack']);
  });

  it('change to lib/orphan.ts (unreferenced) → []', async () => {
    const result = await runE2e(projectPath, ['lib/orphan.ts']);
    expect(result.affectedStacks).toEqual([]);
    expect(result.traces).toEqual([]);
  });

  it('change to bin/app.ts → both stacks (instantiation site)', async () => {
    const result = await runE2e(projectPath, ['bin/app.ts']);
    expect(result.affectedStacks).toEqual(['ApiStack', 'WorkerStack']);
  });
});
