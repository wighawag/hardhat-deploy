---
id: "592-001"
issue: 592
title: "Add --reset flag to the deploy task and provide a wrapWithReset helper"
depends_on: []
---

## Description

In hardhat-deploy v1, `hardhat deploy --reset` would force a redeploy of all contracts even if the bytecode hadn't changed. In v2, there's no `--reset` flag on the `deploy` task. The `alwaysOverride` option exists at the individual `deploy()` call level (in `@rocketh/deploy`), but there's no way to trigger it from the CLI.

This task adds:
1. A `--reset` flag to the `deploy` task definition
2. Logic in the deploy task handler to set `process.env.HARDHAT_DEPLOY_RESET = 'true'` when the flag is passed
3. A `wrapWithReset` helper function exported from `hardhat-deploy/helpers` that wraps the `@rocketh/deploy` extension so that `alwaysOverride: true` is automatically applied when `HARDHAT_DEPLOY_RESET=true`

The environment variable approach follows the existing pattern used by `HARDHAT_FORK` in this codebase. The `wrapWithReset` helper provides a type-safe way for users to opt into reset behavior without losing generics (unlike the `any`-cast workaround described in the issue).

The `alwaysOverride` approach is preferred over deleting deployment files because:
- It works correctly with `--tags` (only resets contracts whose deploy scripts actually run)
- The v1 `--reset` had known issues (#300, #130) when deleting all deployments with `--tags`

### How users will use it

In their `rocketh/config.ts`:
```typescript
import * as deployExtension from '@rocketh/deploy';
import { wrapWithReset } from 'hardhat-deploy/helpers';

const extensions = {
  ...wrapWithReset(deployExtension),
  ...readExecuteExtension,
};
```

Then from CLI:
```bash
npx hardhat deploy --reset
```

## Acceptance Criteria

- The `deploy` task accepts a `--reset` boolean flag (i.e., `npx hardhat deploy --reset` does not error)
- When `--reset` is passed, `process.env.HARDHAT_DEPLOY_RESET` is set to `'true'` before deploy scripts execute
- When `--reset` is NOT passed, `process.env.HARDHAT_DEPLOY_RESET` is NOT set (or is cleaned up if previously set)
- A `wrapWithReset` function is exported from `hardhat-deploy/helpers` that:
  - Accepts a deploy extension object (like `import * as deployExtension from '@rocketh/deploy'`)
  - Returns a new extension object where the `deploy` function automatically passes `alwaysOverride: true` when `process.env.HARDHAT_DEPLOY_RESET === 'true'`
  - Preserves the original type signature (no `any` casts needed by the consumer)
- The `--reset` flag is documented in the task's description string
- The `TODO? reset?: boolean;` comment in `packages/hardhat-deploy/src/tasks/deploy.ts` is resolved

## Implementation Notes

### Files to modify

1. **`packages/hardhat-deploy/src/index.ts`** — Add the `--reset` flag to the deploy task definition.

   In the task builder chain (around line 30), add:
   ```typescript
   .addFlag({name: 'reset', description: 'if set, force re-deploy of all contracts (sets alwaysOverride on deploy calls)'})
   ```
   Place it after the existing `.addFlag` calls (e.g., after `reportGasUsed`).

2. **`packages/hardhat-deploy/src/tasks/deploy.ts`** — Handle the `--reset` flag.

   - Add `reset: boolean` to the `RunActionArguments` interface (and remove/update the `// TODO? reset?: boolean;` comment)
   - At the start of `runScriptWithHardhat`, before calling `loadAndExecuteDeploymentsFromFiles`, set the env var:
     ```typescript
     if (args.reset) {
       process.env.HARDHAT_DEPLOY_RESET = 'true';
     } else {
       delete process.env.HARDHAT_DEPLOY_RESET;
     }
     ```
   - The `delete` ensures a previous run in the same process doesn't leak the flag.

3. **`packages/hardhat-deploy/src/helpers.ts`** — Add the `wrapWithReset` helper function.

   Add a new exported function at the end of the file:
   ```typescript
   /**
    * Wraps a deploy extension so that `alwaysOverride: true` is automatically applied
    * when the `--reset` flag is passed to the deploy task (via HARDHAT_DEPLOY_RESET env var).
    *
    * Usage in rocketh/config.ts:
    * ```typescript
    * import * as deployExtension from '@rocketh/deploy';
    * import { wrapWithReset } from 'hardhat-deploy/helpers';
    *
    * const extensions = {
    *   ...wrapWithReset(deployExtension),
    * };
    * ```
    */
   export function wrapWithReset<T extends { deploy: (env: any) => (...args: any[]) => any }>(
     extension: T,
   ): T {
     const wrappedDeploy = ((env: any) => {
       const deployFn = extension.deploy(env);
       return (name: any, args: any, options?: any) => {
         const isReset = process.env.HARDHAT_DEPLOY_RESET === 'true';
         return deployFn(name, args, {
           ...options,
           alwaysOverride: isReset || options?.alwaysOverride,
         });
       };
     }) as T['deploy'];

     return {
       ...extension,
       deploy: wrappedDeploy,
     };
   }
   ```

   The generic `<T extends ...>` pattern preserves the original type of the extension object so consumers don't lose type information.

4. **`packages/hardhat-deploy/package.json`** — No changes needed. The `helpers` export path already exists:
   ```json
   "./helpers": {
     "import": {
       "types": "./dist/helpers.d.ts",
       "default": "./dist/helpers.js"
     }
   }
   ```

### Patterns to follow

- The env var pattern mirrors `HARDHAT_FORK` usage in `helpers.ts` (line ~42: `const fork = process.env.HARDHAT_FORK`)
- Flag definition follows the existing `skipPrompts` and `reportGasUsed` patterns in `index.ts`
- The `RunActionArguments` interface pattern is already established in `tasks/deploy.ts`

### Key types from dependencies (for reference)

The `@rocketh/deploy` package exports:
```typescript
export type DeployOptions = {
  linkedData?: LinkedDataProvided;
  deterministic?: boolean | `0x${string}` | { type: 'create2' | 'create3'; salt?: `0x${string}` };
  libraries?: { [name: string]: Address };
} & ({ skipIfAlreadyDeployed?: boolean } | { alwaysOverride?: boolean });

export function deploy(env: Environment): <TAbi extends Abi>(
  name: string,
  args: DeploymentConstruction<TAbi>,
  options?: DeployOptions,
) => Promise<DeployResult<TAbi>>;
```

The `alwaysOverride` option in `@rocketh/deploy` causes the deploy function to skip the bytecode comparison check and always redeploy, which is the desired behavior for `--reset`.

### Edge cases

- If `--reset` and `--tags` are used together, only the contracts whose deploy scripts match the tags will be redeployed. This is the correct behavior (unlike v1's approach of deleting all deployment files).
- The env var is cleaned up (`delete process.env.HARDHAT_DEPLOY_RESET`) when `--reset` is not passed, preventing leakage across multiple task invocations in the same process.
- If `alwaysOverride` is already explicitly set in a deploy script's options, the `||` operator preserves it.
