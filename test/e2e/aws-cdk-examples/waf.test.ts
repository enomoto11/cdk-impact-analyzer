import * as fs from 'node:fs';
import * as path from 'node:path';

import { describe, expect, it } from 'vitest';

import { awsCdkExamplesFixture, runE2e } from '../harness';

const projectPath = awsCdkExamplesFixture('waf');
const isAvailable = fs.existsSync(path.join(projectPath, 'cdk.json'));

describe.skipIf(!isAvailable)('e2e/aws-cdk-examples/waf', () => {
  it('fixture project is well-formed', () => {
    expect(fs.existsSync(path.join(projectPath, 'app.ts'))).toBe(true);
    expect(fs.existsSync(path.join(projectPath, 'waf-regional.ts'))).toBe(true);
    expect(fs.existsSync(path.join(projectPath, 'waf-cloudfront.ts'))).toBe(true);
  });

  it('no changes → []', async () => {
    const result = await runE2e(projectPath, []);
    expect(result.affectedStacks).toEqual([]);
  });

  it('change to waf-regional.ts → [WafRegionalStack]', async () => {
    const result = await runE2e(projectPath, ['waf-regional.ts']);
    expect(result.affectedStacks).toEqual(['WafRegionalStack']);
  });

  it('change to waf-cloudfront.ts → [WafCloudFrontStack]', async () => {
    const result = await runE2e(projectPath, ['waf-cloudfront.ts']);
    expect(result.affectedStacks).toEqual(['WafCloudFrontStack']);
  });

  it('change to app.ts (whole file) → both stacks via instantiation sites', async () => {
    const result = await runE2e(projectPath, ['app.ts']);
    expect(result.affectedStacks).toEqual(['WafCloudFrontStack', 'WafRegionalStack']);
  });
});

if (!isAvailable) {
  describe('e2e/aws-cdk-examples/waf (cache missing)', () => {
    it.skip('run `pnpm e2e:setup` to populate .e2e-cache/', () => {});
  });
}
