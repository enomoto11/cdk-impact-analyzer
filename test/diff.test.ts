import { describe, expect, it } from 'vitest';

import { parseDiffHunks, resolveChangedFiles } from '../src/diff';

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

describe('parseDiffHunks', () => {
  it('parses a single hunk', () => {
    const diff = `diff --git a/foo.ts b/foo.ts
@@ -10,3 +12,5 @@
`;
    const result = parseDiffHunks(diff);
    expect(result.get('foo.ts')).toEqual([{ startLine: 12, endLineExclusive: 17 }]);
  });

  it('parses multiple hunks within one file', () => {
    const diff = `diff --git a/foo.ts b/foo.ts
@@ -10,3 +12,5 @@
@@ -50,1 +55,1 @@
`;
    const result = parseDiffHunks(diff);
    expect(result.get('foo.ts')).toEqual([
      { startLine: 12, endLineExclusive: 17 },
      { startLine: 55, endLineExclusive: 56 },
    ]);
  });

  it('parses multiple files in one diff', () => {
    const diff = `diff --git a/foo.ts b/foo.ts
@@ -1,1 +1,1 @@
diff --git a/bar.ts b/bar.ts
@@ -5,2 +5,3 @@
`;
    const result = parseDiffHunks(diff);
    expect(result.get('foo.ts')).toEqual([{ startLine: 1, endLineExclusive: 2 }]);
    expect(result.get('bar.ts')).toEqual([{ startLine: 5, endLineExclusive: 8 }]);
  });

  it('handles short hunk header with no explicit count (defaults to 1)', () => {
    const diff = `diff --git a/foo.ts b/foo.ts
@@ -10 +12 @@
`;
    const result = parseDiffHunks(diff);
    expect(result.get('foo.ts')).toEqual([{ startLine: 12, endLineExclusive: 13 }]);
  });

  it('skips hunks with zero new lines (pure deletion)', () => {
    const diff = `diff --git a/foo.ts b/foo.ts
@@ -10,3 +9,0 @@
`;
    const result = parseDiffHunks(diff);
    expect(result.get('foo.ts')).toBeUndefined();
  });

  it('uses the b/ side as the file path for renames', () => {
    const diff = `diff --git a/old.ts b/new.ts
@@ -1,1 +1,1 @@
`;
    const result = parseDiffHunks(diff);
    expect(result.get('new.ts')).toEqual([{ startLine: 1, endLineExclusive: 2 }]);
    expect(result.get('old.ts')).toBeUndefined();
  });

  it('ignores hunks before any diff --git line (defensive)', () => {
    const diff = `@@ -1,1 +1,1 @@
diff --git a/foo.ts b/foo.ts
@@ -2,1 +2,1 @@
`;
    const result = parseDiffHunks(diff);
    expect(result.get('foo.ts')).toEqual([{ startLine: 2, endLineExclusive: 3 }]);
  });
});
