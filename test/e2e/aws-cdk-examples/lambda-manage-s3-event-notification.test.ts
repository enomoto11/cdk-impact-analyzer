import * as fs from 'node:fs';
import * as path from 'node:path';

import { describe, expect, it } from 'vitest';

import { awsCdkExamplesFixture, runE2e } from '../harness';

const projectPath = awsCdkExamplesFixture('lambda-manage-s3-event-notification');
const isAvailable = fs.existsSync(path.join(projectPath, 'cdk.json'));

describe.skipIf(!isAvailable)(
  'e2e/aws-cdk-examples/lambda-manage-s3-event-notification',
  () => {
    it('fixture project is well-formed', () => {
      expect(fs.existsSync(path.join(projectPath, 'cdk.json'))).toBe(true);
      expect(
        fs.existsSync(path.join(projectPath, 'bin/lambda-manage-s3-event-notifications.ts')),
      ).toBe(true);
      expect(fs.existsSync(path.join(projectPath, 'lib/shared-resources-stack.ts'))).toBe(true);
      expect(fs.existsSync(path.join(projectPath, 'lib/sample-service-stack.ts'))).toBe(true);
    });

    it('returns an empty result with no changes (harness wiring)', async () => {
      const result = await runE2e(projectPath, []);
      expect(result.affectedStacks).toEqual([]);
      expect(result.traces).toEqual([]);
    });

    it.todo(
      'change to bin/lambda-manage-s3-event-notifications.ts → [SharedStack, AStack, BStack] (all)',
    );
    it.todo('change to lib/shared-resources-stack.ts → [SharedStack] only');
    it.todo(
      'change to lib/sample-service-stack.ts → [AStack, BStack] (two stacks share one file)',
    );
    it.todo(
      'change to lambda/manage-s3-event-notifications.js (non-TS asset) → [] (spec: skip non-TS files)',
    );
  },
);

if (!isAvailable) {
  describe('e2e/aws-cdk-examples/lambda-manage-s3-event-notification (cache missing)', () => {
    it.skip('run `pnpm e2e:setup` to populate .e2e-cache/aws-cdk-examples/', () => {});
  });
}
