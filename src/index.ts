import * as fs from 'node:fs';
import * as path from 'node:path';

import * as core from '@actions/core';

import { analyze, type ChangedFile } from './analyzer';
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

    // TODO(diff): resolve diff source (PR number or base/head refs) into ChangedFile[]
    const changes: ChangedFile[] = [];

    const result = await analyze({ projectPath, tsconfigPath, changes });

    core.setOutput('affected-stacks', JSON.stringify(result.affectedStacks));
    core.setOutput('affected-stack-count', result.affectedStacks.length.toString());
    core.info(`Affected stacks: ${result.affectedStacks.length}`);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    core.setFailed(message);
  }
}

void run();
