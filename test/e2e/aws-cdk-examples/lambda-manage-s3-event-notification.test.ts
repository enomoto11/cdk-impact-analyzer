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

    it('returns an empty result with no changes', async () => {
      const result = await runE2e(projectPath, []);
      expect(result.affectedStacks).toEqual([]);
      expect(result.traces).toEqual([]);
    });

    it('change to bin/lambda-manage-s3-event-notifications.ts → [AStack, BStack, SharedStack] (all)', async () => {
      const result = await runE2e(projectPath, [
        'bin/lambda-manage-s3-event-notifications.ts',
      ]);
      expect(result.affectedStacks).toEqual(['AStack', 'BStack', 'SharedStack']);
    });

    it('change to lib/shared-resources-stack.ts → [SharedStack] only', async () => {
      const result = await runE2e(projectPath, ['lib/shared-resources-stack.ts']);
      expect(result.affectedStacks).toEqual(['SharedStack']);
    });

    it('change to lib/sample-service-stack.ts → [AStack, BStack] (two stacks share one file)', async () => {
      const result = await runE2e(projectPath, ['lib/sample-service-stack.ts']);
      expect(result.affectedStacks).toEqual(['AStack', 'BStack']);
    });

    it('change to lambda/manage-s3-event-notifications.js (non-TS asset) → []', async () => {
      const result = await runE2e(projectPath, ['lambda/manage-s3-event-notifications.js']);
      expect(result.affectedStacks).toEqual([]);
      expect(result.traces).toEqual([]);
    });

    describe('changedLineRanges narrowing in lib/sample-service-stack.ts', () => {
      // lib/sample-service-stack.ts (pinned SHA):
      //   10-12: export interface AStackProps ...
      //   13-61: export class AStack extends cdk.Stack { ... }
      //      62: (blank)
      //   63-65: export interface BStackProps ...
      //  66-114: export class BStack extends cdk.Stack { ... }

      const file = 'lib/sample-service-stack.ts';

      it('only AStack class lines (13-61) → [AStack]', async () => {
        const result = await runE2e(projectPath, [file], {
          changedLineRanges: { [file]: [{ startLine: 13, endLineExclusive: 62 }] },
        });
        expect(result.affectedStacks).toEqual(['AStack']);
      });

      it('only BStack class lines (66-114) → [BStack]', async () => {
        const result = await runE2e(projectPath, [file], {
          changedLineRanges: { [file]: [{ startLine: 66, endLineExclusive: 115 }] },
        });
        expect(result.affectedStacks).toEqual(['BStack']);
      });

      it('only the blank line between classes (62) → []', async () => {
        const result = await runE2e(projectPath, [file], {
          changedLineRanges: { [file]: [{ startLine: 62, endLineExclusive: 63 }] },
        });
        expect(result.affectedStacks).toEqual([]);
      });

      it('only AStackProps interface (lines 10-12) → [AStack] (Props reached via constructor signature)', async () => {
        const result = await runE2e(projectPath, [file], {
          changedLineRanges: { [file]: [{ startLine: 10, endLineExclusive: 13 }] },
        });
        expect(result.affectedStacks).toEqual(['AStack']);
      });
    });
  },
);

if (!isAvailable) {
  describe('e2e/aws-cdk-examples/lambda-manage-s3-event-notification (cache missing)', () => {
    it.skip('run `pnpm e2e:setup` to populate .e2e-cache/aws-cdk-examples/', () => {});
  });
}
