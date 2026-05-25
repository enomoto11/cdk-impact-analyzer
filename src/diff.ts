import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';

import * as github from '@actions/github';

import type { ChangedFile } from './analyzer';

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
    ['diff', '--name-only', '--diff-filter=AMR', '--relative', `${base}...${head}`],
    { cwd: input.projectPath, encoding: 'utf8' },
  );

  const result: ChangedFile[] = [];
  for (const line of output.split('\n')) {
    const rel = line.trim();
    if (!rel) continue;
    const abs = path.resolve(input.projectPath, rel);
    if (!fs.existsSync(abs)) continue;
    result.push({ path: abs });
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
