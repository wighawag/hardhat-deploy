---
id: "601-001"
issue: 601
title: "Add waitForDeployment helper that polls eth_getCode to handle RPC read-after-write races"
depends_on: []
---

## Description

When deploying contracts to testnets or mainnets through load-balanced RPCs (e.g., Alchemy, Infura), a `env.read()` call immediately after `env.deploy()` can fail with `AbiDecodingZeroDataError` because the `eth_call` lands on a replica that hasn't replicated the post-deploy block yet.

In hardhat-deploy v1 + ethers, internal `eth_getCode` polling in `getContract`/`tx.wait()` gave the load balancer time to settle. In v2 + rocketh + viem, this implicit behavior was intentionally removed.

This task adds a `waitForDeployment(provider, deployment)` helper function exported from `hardhat-deploy/helpers` that polls `eth_getCode` on the deployed contract address until it returns non-empty bytecode (i.e., not `"0x"`). This gives users a simple, per-deploy-call way to ensure their contract is observable before reading from it.

**Note:** The rocketh environment already has a `confirmationsRequired` config at the chain level (in `ChainUserConfig`) that is used by `waitForTransactionReceipt` when broadcasting. However, block confirmation count doesn't guarantee code visibility across LB replicas. The `eth_getCode` poll is a more direct signal. Adding a per-call `confirmations` option to `@rocketh/deploy`'s `DeployOptions` is a separate improvement that requires changes to the upstream `rocketh` repository (`@rocketh/deploy` package).

## Acceptance Criteria

- A new function `waitForDeployment` is exported from the `hardhat-deploy/helpers` module
- `waitForDeployment` accepts a provider (EIP-1193 compatible) and a deployment object (with at minimum an `address` field), plus optional config (polling interval, timeout)
- `waitForDeployment` polls `eth_getCode` for the deployment's address until the result is not `"0x"` (empty), then resolves
- `waitForDeployment` throws a descriptive error if the timeout is exceeded before code becomes visible
- The function works with the provider available from `env.network.provider` (i.e., it accepts an object with a `request` method matching the EIP-1193 pattern)
- The export is available via `import { waitForDeployment } from 'hardhat-deploy/helpers'`
- TypeScript types are correct and exported

## Implementation Notes

### Files to modify

1. **`packages/hardhat-deploy/src/helpers.ts`** — Add the `waitForDeployment` function

### Function signature

```typescript
export async function waitForDeployment(
  provider: { request(args: { method: string; params?: any[] }): Promise<any> },
  deployment: { address: `0x${string}` },
  options?: {
    pollingIntervalMs?: number;  // default: 1000 (1 second)
    timeoutMs?: number;          // default: 60000 (60 seconds)
  }
): Promise<void>
```

### Implementation approach

```typescript
export async function waitForDeployment(
  provider: { request(args: { method: string; params?: any[] }): Promise<any> },
  deployment: { address: `0x${string}` },
  options?: {
    pollingIntervalMs?: number;
    timeoutMs?: number;
  }
): Promise<void> {
  const pollingIntervalMs = options?.pollingIntervalMs ?? 1000;
  const timeoutMs = options?.timeoutMs ?? 60_000;
  const startTime = Date.now();

  while (true) {
    const code = await provider.request({
      method: 'eth_getCode',
      params: [deployment.address, 'latest'],
    });
    if (code && code !== '0x') {
      return;
    }
    if (Date.now() - startTime >= timeoutMs) {
      throw new Error(
        `waitForDeployment: contract code at ${deployment.address} was not observable after ${timeoutMs}ms. ` +
        `This may indicate the RPC endpoint has not yet replicated the deployment transaction.`
      );
    }
    await new Promise((resolve) => setTimeout(resolve, pollingIntervalMs));
  }
}
```

### Export configuration

The `packages/hardhat-deploy/package.json` already has an export for `"./helpers"` pointing to `dist/helpers.js` / `dist/helpers.d.ts`, so `waitForDeployment` will automatically be available when exported from `packages/hardhat-deploy/src/helpers.ts`.

### Usage pattern (for documentation / testing)

```typescript
import { waitForDeployment } from 'hardhat-deploy/helpers';

// In a deploy script:
const yourContract = await env.deploy("YourContract", {
  account: deployer,
  artifact: artifacts.YourContract,
  args: [deployer],
});

// Wait until the contract code is observable on the RPC
await waitForDeployment(env.network.provider, yourContract);

// Now safe to read
const greeting = await env.read(yourContract, { functionName: "greeting" });
```

### Conventions to follow

- Use the same ESM module pattern as the rest of `helpers.ts` (named exports, `.js` extensions for local imports)
- The provider parameter type should be minimal/generic — just `{ request(args: { method: string; params?: any[] }): Promise<any> }` — to avoid coupling to specific EIP-1193 type packages while still being compatible with `env.network.provider`
- The deployment parameter type should be minimal — just `{ address: \`0x${string}\` }` — to match the `MinimalDeployment` / `Deployment` types from `@rocketh/core` without importing them
- Keep the function synchronous in the `helpers.ts` module (no need for dynamic imports)

### Edge cases

- On local EDR/Hardhat networks, `eth_getCode` should return immediately (no race), so the function returns on first poll with no delay
- If the deployment truly failed (e.g., reverted constructor), the contract address from the receipt will have no code. The timeout will eventually fire and throw a descriptive error
- The function should not swallow errors from `provider.request()` — if the RPC itself errors (e.g., network issue), let it propagate immediately
