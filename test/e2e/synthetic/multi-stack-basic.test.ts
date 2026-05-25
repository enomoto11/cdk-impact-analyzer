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
  });

  it('returns an empty result with no changes (harness wiring)', async () => {
    const result = await runE2e(projectPath, []);
    expect(result.affectedStacks).toEqual([]);
    expect(result.traces).toEqual([]);
  });

  it.todo('change to lib/shared-table.ts → [ApiStack, WorkerStack] (shared construct → multiple stacks)');
  it.todo('change to lib/api-only-helper.ts → [ApiStack] (leaf reached by one stack)');
  it.todo('change to a file referenced by no stack → []');
});
