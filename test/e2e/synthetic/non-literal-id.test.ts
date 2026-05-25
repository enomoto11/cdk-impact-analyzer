import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { runE2e, syntheticFixture } from '../harness';

const projectPath = syntheticFixture('non-literal-id');

describe('e2e/synthetic/non-literal-id', () => {
  let warnSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    warnSpy.mockRestore();
  });

  it('skips instantiation and warns when the id is a template literal', async () => {
    const result = await runE2e(projectPath, ['lib/template-stack.ts']);
    expect(result.affectedStacks).toEqual([]);
    expect(warnSpy).toHaveBeenCalledTimes(1);
    const message = warnSpy.mock.calls[0]?.[0];
    expect(message).toContain('non-string-literal');
    expect(message).toContain('TemplateStack');
    expect(message).toContain('${envName}-Template');
  });
});
