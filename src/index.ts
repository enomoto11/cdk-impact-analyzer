import * as fs from 'node:fs';
import * as path from 'node:path';

import * as core from '@actions/core';

import { detectCdkProject } from './project-detector';

async function run(): Promise<void> {
  try {
    const projectPath = path.resolve(core.getInput('project-path') || '.');
    const tsconfigPath = path.resolve(
      projectPath,
      core.getInput('tsconfig-path') || 'tsconfig.json',
    );

    if (!fs.existsSync(projectPath)) {
      core.setFailed(`project-path does not exist: ${projectPath}`);
      return;
    }

    const detection = detectCdkProject(projectPath);
    if (!detection.isCdkProject) {
      core.setFailed(
        `Not a CDK project at ${projectPath}. Reason: ${detection.reason}. ` +
          'Clone the CDK repository into the runner workspace before invoking this action.',
      );
      return;
    }

    if (!fs.existsSync(tsconfigPath)) {
      core.setFailed(`tsconfig.json not found at ${tsconfigPath}`);
      return;
    }

    // TODO(1): resolve diff source (PR number or base/head refs) → unified diff
    // TODO(2): map diff hunks → changed symbols using ts-morph
    // TODO(3): trace references upward to a Stack instantiation
    // TODO(4): emit unique stack names, deduplicating shared instantiation sites

    const affectedStacks: string[] = [];
    core.setOutput('affected-stacks', JSON.stringify(affectedStacks));
    core.setOutput('affected-stack-count', affectedStacks.length.toString());
    core.info(`Affected stacks: ${affectedStacks.length}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    core.setFailed(message);
  }
}

void run();
