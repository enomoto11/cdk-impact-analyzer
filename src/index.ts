import * as fs from 'node:fs';
import * as path from 'node:path';

import * as core from '@actions/core';

import { analyze } from './analyzer';
import { resolveChangedFiles } from './diff';
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

    const changes = await resolveChangedFiles({
      projectPath,
      prNumber: core.getInput('pr-number') || undefined,
      baseRef: core.getInput('base-ref') || undefined,
      headRef: core.getInput('head-ref') || undefined,
      githubToken: core.getInput('github-token') || undefined,
    });

    core.info(`Resolved ${changes.length} changed file(s) from diff.`);

    const result = await analyze({ projectPath, tsconfigPath, changes });

    core.setOutput('affected-stacks', JSON.stringify(result.affectedStacks));
    core.setOutput('affected-stack-count', result.affectedStacks.length.toString());
    core.info(`Affected stacks: ${result.affectedStacks.length}`);
    for (const trace of result.traces) {
      core.info(`  - ${trace.stackName} (reached via ${trace.reachedFrom.length} file(s))`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    core.setFailed(message);
  }
}

void run();
