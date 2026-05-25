# cdk-impact-analyzer

GitHub Action that reads a PR diff in an AWS CDK (TypeScript) repository and lists
the CDK stacks the change affects.

## Why

Most CDK teams run `cdk diff` and `cdk deploy` against a hand-picked subset of stacks
on each PR. A change to a shared construct or utility can affect stacks outside that
subset, and you ship those changes without review. Running every stack on every PR
closes the gap but slows the pipeline.

For each changed TypeScript symbol in the diff, `cdk-impact-analyzer` follows
references up the call graph (via [ts-morph](https://github.com/dsherret/ts-morph))
until it reaches a `new XxxStack(...)` instantiation. The union of those stack names
is the output.

## Scope

- MVP: TypeScript CDK projects only.
- Check out the target CDK repository before this action runs. If `project-path` has
  no readable `cdk.json`, the action exits.
- Other host languages (Python, Go, Java) are out of scope for the MVP. Each will
  need its own language-server adapter.

## Usage

```yaml
name: CDK Impact

on:
  pull_request:

jobs:
  analyze:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: OWNER/cdk-impact-analyzer@v1
        id: impact
        with:
          pr-number: ${{ github.event.pull_request.number }}
      - if: steps.impact.outputs.affected-stack-count != '0'
        run: |
          for stack in $(echo '${{ steps.impact.outputs.affected-stacks }}' | jq -r '.[]'); do
            npx cdk diff "$stack"
          done
```

`fetch-depth: 0` is required so the action can read both ends of the PR diff
locally. Replace `OWNER/cdk-impact-analyzer@v1` with the actual repository and
ref you publish.

Pass explicit refs instead of `pr-number` for push events or local dispatch:

```yaml
      - uses: OWNER/cdk-impact-analyzer@v1
        with:
          base-ref: origin/main
          head-ref: HEAD
```

## Inputs

See [`action.yml`](./action.yml). Pass either `pr-number`, or both `base-ref` and
`head-ref`.

## Outputs

- `affected-stacks`: JSON array of stack names.
- `affected-stack-count`: count, as a string.

## Development

```bash
pnpm install
pnpm typecheck
pnpm test
pnpm build         # bundles src/ into dist/ via @vercel/ncc
pnpm e2e:setup     # fetches the pinned aws-cdk-examples into .e2e-cache/
```

Commit `dist/`. GitHub Actions runs it as the action entry point.

`e2e-fixtures.json` pins the aws-cdk-examples commit used by the e2e suite. Bump
the `sha` field and rerun `pnpm e2e:setup` to update.
