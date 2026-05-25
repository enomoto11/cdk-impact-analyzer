import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

import * as github from '@actions/github';

import type { ChangedFile, ChangedLineRange } from './analyzer';

export interface DiffResolveInput {
  projectPath: string;
  prNumber?: string;
  baseRef?: string;
  headRef?: string;
  githubToken?: string;
}

export async function resolveChangedFiles(input: DiffResolveInput): Promise<ChangedFile[]> {
  const { base, head } = await resolveRefs(input);

  const output = execFileSync(
    'git',
    ['diff', '-U0', '--no-color', '--diff-filter=AMR', '--relative', `${base}...${head}`],
    { cwd: input.projectPath, encoding: 'utf8' },
  );

  const hunks = parseDiffHunks(output);

  const result: ChangedFile[] = [];
  for (const [relPath, ranges] of hunks) {
    const abs = path.resolve(input.projectPath, relPath);
    if (!fs.existsSync(abs)) continue;
    result.push({ path: abs, changedLineRanges: ranges });
  }
  return result;
}

export function parseDiffHunks(diff: string): Map<string, ChangedLineRange[]> {
  const result = new Map<string, ChangedLineRange[]>();
  let currentFile: string | null = null;

  for (const line of diff.split('\n')) {
    if (line.startsWith('diff --git ')) {
      const m = line.match(/^diff --git a\/.+? b\/(.+)$/);
      currentFile = m && m[1] ? m[1] : null;
      continue;
    }
    if (!currentFile) continue;
    if (!line.startsWith('@@')) continue;

    const m = line.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/);
    if (!m || !m[1]) continue;
    const start = Number(m[1]);
    const count = m[2] !== undefined ? Number(m[2]) : 1;
    if (count === 0) continue;
    let arr = result.get(currentFile);
    if (!arr) {
      arr = [];
      result.set(currentFile, arr);
    }
    arr.push({ startLine: start, endLineExclusive: start + count });
  }

  return result;
}

async function resolveRefs(input: DiffResolveInput): Promise<{ base: string; head: string }> {
  if (input.prNumber) {
    if (!input.githubToken) {
      throw new Error('github-token is required when pr-number is provided');
    }
    const prNum = Number(input.prNumber);
    if (!Number.isInteger(prNum) || prNum <= 0) {
      throw new Error(`pr-number is not a valid positive integer: ${input.prNumber}`);
    }
    const { owner, repo } = github.context.repo;
    const octokit = github.getOctokit(input.githubToken);
    const pr = await octokit.rest.pulls.get({
      owner,
      repo,
      pull_number: prNum,
    });
    return { base: pr.data.base.sha, head: pr.data.head.sha };
  }

  if (input.baseRef && input.headRef) {
    return { base: input.baseRef, head: input.headRef };
  }

  throw new Error('Either pr-number, or both base-ref and head-ref, must be provided');
}
