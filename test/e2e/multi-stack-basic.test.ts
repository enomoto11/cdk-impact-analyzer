import * as fs from 'node:fs';

import { describe, expect, it } from 'vitest';

import { fixturePath, runE2e } from './harness';

const FIXTURE = 'multi-stack-basic';

describe('e2e: multi-stack-basic', () => {
  it('fixture project is well-formed', () => {
    expect(fs.existsSync(fixturePath(FIXTURE, 'cdk.json'))).toBe(true);
    expect(fs.existsSync(fixturePath(FIXTURE, 'tsconfig.json'))).toBe(true);
    expect(fs.existsSync(fixturePath(FIXTURE, 'bin/app.ts'))).toBe(true);
    expect(fs.existsSync(fixturePath(FIXTURE, 'lib/shared-table.ts'))).toBe(true);
  });

  it('returns an empty result with no changes (harness wiring)', async () => {
    const result = await runE2e(FIXTURE, []);
    expect(result.affectedStacks).toEqual([]);
    expect(result.traces).toEqual([]);
  });

  it.todo('detects both ApiStack and WorkerStack when shared-table.ts changes');
  it.todo('detects only ApiStack when api-only-helper.ts changes');
  it.todo('returns empty when an unreferenced file changes');
});
