import * as fs from 'node:fs';
import * as path from 'node:path';

import { describe, expect, it } from 'vitest';

import { awsCdkExamplesFixture, runE2e } from '../harness';

const projectPath = awsCdkExamplesFixture('ecs/cross-stack-load-balancer');
const isAvailable = fs.existsSync(path.join(projectPath, 'cdk.json'));

const ALL_STACKS = [
  'CrossStackLBInfra',
  'SplitAtListener-LBStack',
  'SplitAtListener-ServiceStack',
  'SplitAtTargetGroup-LBStack',
  'SplitAtTargetGroup-ServiceStack',
].sort();

describe.skipIf(!isAvailable)('e2e/aws-cdk-examples/ecs/cross-stack-load-balancer', () => {
  it('fixture project is well-formed', () => {
    expect(fs.existsSync(path.join(projectPath, 'index.ts'))).toBe(true);
    expect(fs.existsSync(path.join(projectPath, 'split-at-listener.ts'))).toBe(true);
    expect(fs.existsSync(path.join(projectPath, 'split-at-targetgroup.ts'))).toBe(true);
  });

  it('no changes → []', async () => {
    const result = await runE2e(projectPath, []);
    expect(result.affectedStacks).toEqual([]);
  });

  it('change to split-at-listener.ts (two stacks share one file) → both Listener stacks', async () => {
    const result = await runE2e(projectPath, ['split-at-listener.ts']);
    expect(result.affectedStacks).toEqual([
      'SplitAtListener-LBStack',
      'SplitAtListener-ServiceStack',
    ]);
  });

  it('change to split-at-targetgroup.ts (two stacks share one file) → both TargetGroup stacks', async () => {
    const result = await runE2e(projectPath, ['split-at-targetgroup.ts']);
    expect(result.affectedStacks).toEqual([
      'SplitAtTargetGroup-LBStack',
      'SplitAtTargetGroup-ServiceStack',
    ]);
  });

  it('change to index.ts (whole file) → all 5 stacks (defines SharedInfra + instantiates all)', async () => {
    const result = await runE2e(projectPath, ['index.ts']);
    expect(result.affectedStacks).toEqual(ALL_STACKS);
  });

  describe('changedLineRanges narrowing in index.ts', () => {
    // index.ts:
    //   11-23: class SharedInfraStack extends Stack { ... }
    //      27: const infra = new SharedInfraStack(app, 'CrossStackLBInfra');
    //   30-32: new SplitAtListener_LoadBalancerStack(app, 'SplitAtListener-LBStack', { ... })
    //   33-37: new SplitAtListener_ServiceStack(app, 'SplitAtListener-ServiceStack', { ... })
    //   40-42: new SplitAtTargetGroup_LoadBalancerStack(app, 'SplitAtTargetGroup-LBStack', { ... })
    //   43-47: new SplitAtTargetGroup_ServiceStack(app, 'SplitAtTargetGroup-ServiceStack', { ... })

    it('only SharedInfraStack class (lines 11-23) → [CrossStackLBInfra]', async () => {
      const result = await runE2e(projectPath, ['index.ts'], {
        changedLineRanges: { 'index.ts': [{ startLine: 11, endLineExclusive: 24 }] },
      });
      expect(result.affectedStacks).toEqual(['CrossStackLBInfra']);
    });

    it('only the SharedInfraStack instantiation (line 27) → [CrossStackLBInfra]', async () => {
      const result = await runE2e(projectPath, ['index.ts'], {
        changedLineRanges: { 'index.ts': [{ startLine: 27, endLineExclusive: 28 }] },
      });
      expect(result.affectedStacks).toEqual(['CrossStackLBInfra']);
    });

    it('only SplitAtListener_LoadBalancerStack instantiation (lines 30-32) → [SplitAtListener-LBStack]', async () => {
      const result = await runE2e(projectPath, ['index.ts'], {
        changedLineRanges: { 'index.ts': [{ startLine: 30, endLineExclusive: 33 }] },
      });
      expect(result.affectedStacks).toEqual(['SplitAtListener-LBStack']);
    });

    it('only SplitAtTargetGroup_ServiceStack instantiation (lines 43-47) → [SplitAtTargetGroup-ServiceStack]', async () => {
      const result = await runE2e(projectPath, ['index.ts'], {
        changedLineRanges: { 'index.ts': [{ startLine: 43, endLineExclusive: 48 }] },
      });
      expect(result.affectedStacks).toEqual(['SplitAtTargetGroup-ServiceStack']);
    });
  });
});

if (!isAvailable) {
  describe('e2e/aws-cdk-examples/ecs/cross-stack-load-balancer (cache missing)', () => {
    it.skip('run `pnpm e2e:setup` to populate .e2e-cache/', () => {});
  });
}
