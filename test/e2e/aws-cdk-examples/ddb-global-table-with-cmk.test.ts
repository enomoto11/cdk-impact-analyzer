import * as fs from 'node:fs';
import * as path from 'node:path';

import { describe, expect, it } from 'vitest';

import { awsCdkExamplesFixture, runE2e } from '../harness';

const projectPath = awsCdkExamplesFixture('ddb/global-table-with-cmk');
const isAvailable = fs.existsSync(path.join(projectPath, 'cdk.json'));

describe.skipIf(!isAvailable)('e2e/aws-cdk-examples/ddb/global-table-with-cmk', () => {
  it('fixture project is well-formed', () => {
    expect(fs.existsSync(path.join(projectPath, 'bin/app.ts'))).toBe(true);
    expect(fs.existsSync(path.join(projectPath, 'lib/global-ddb-cmk.ts'))).toBe(true);
    expect(fs.existsSync(path.join(projectPath, 'lib/stacks/cmk-stack.ts'))).toBe(true);
    expect(fs.existsSync(path.join(projectPath, 'lib/stacks/dynamo-db-stack.ts'))).toBe(true);
  });

  it('no changes → []', async () => {
    const result = await runE2e(projectPath, []);
    expect(result.affectedStacks).toEqual([]);
  });

  it('change to bin/app.ts → [global-ddb-cmk] (sole top-level stack)', async () => {
    const result = await runE2e(projectPath, ['bin/app.ts']);
    expect(result.affectedStacks).toEqual(['global-ddb-cmk']);
  });

  it('change to lib/global-ddb-cmk.ts (parent Stack class) → [global-ddb-cmk]', async () => {
    const result = await runE2e(projectPath, ['lib/global-ddb-cmk.ts']);
    expect(result.affectedStacks).toEqual(['global-ddb-cmk']);
  });

  it('change to lib/stacks/cmk-stack.ts (NestedStack) → [global-ddb-cmk] (transparent via parent closure)', async () => {
    const result = await runE2e(projectPath, ['lib/stacks/cmk-stack.ts']);
    expect(result.affectedStacks).toEqual(['global-ddb-cmk']);
  });

  it('change to lib/stacks/dynamo-db-stack.ts (NestedStack) → [global-ddb-cmk] (transparent via parent closure)', async () => {
    const result = await runE2e(projectPath, ['lib/stacks/dynamo-db-stack.ts']);
    expect(result.affectedStacks).toEqual(['global-ddb-cmk']);
  });
});

if (!isAvailable) {
  describe('e2e/aws-cdk-examples/ddb/global-table-with-cmk (cache missing)', () => {
    it.skip('run `pnpm e2e:setup` to populate .e2e-cache/', () => {});
  });
}
