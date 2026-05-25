import { describe, expect, it } from 'vitest';

import { resolveChangedFiles } from '../src/diff';

describe('resolveChangedFiles input validation', () => {
  it('throws when neither pr-number nor base/head refs are given', async () => {
    await expect(resolveChangedFiles({ projectPath: '/tmp' })).rejects.toThrow(/pr-number/);
  });

  it('throws when pr-number is provided without github-token', async () => {
    await expect(
      resolveChangedFiles({ projectPath: '/tmp', prNumber: '123' }),
    ).rejects.toThrow(/github-token/);
  });

  it('throws when pr-number is not a positive integer', async () => {
    await expect(
      resolveChangedFiles({
        projectPath: '/tmp',
        prNumber: 'not-a-number',
        githubToken: 'fake',
      }),
    ).rejects.toThrow(/not a valid positive integer/);
  });

  it('throws when only base-ref is given (head-ref missing)', async () => {
    await expect(
      resolveChangedFiles({ projectPath: '/tmp', baseRef: 'main' }),
    ).rejects.toThrow(/base-ref/);
  });
});
