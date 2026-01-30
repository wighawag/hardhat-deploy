# How to Deploy with Proxies

Proxies enable contract upgrades by separating logic and storage. This guide covers deploying upgradeable contracts using hardhat-deploy's proxy features.

## Prerequisites

Install the proxy extension:

::: code-group

```bash [npm]
npm install -D @rocketh/proxy
```

```bash [pnpm]
pnpm add -D @rocketh/proxy
```

:::

Add it to your `rocketh/config.ts`:

```typescript
import * as proxyExtensions from '@rocketh/proxy';
import * as deployExtensions from '@rocketh/deploy';

const extensions = {...deployExtensions, ...proxyExtensions};
export {extensions};
```

## Proxy Types

hardhat-deploy supports several proxy patterns:

### 1. Transparent Proxy (OpenZeppelin)
- Admin can upgrade, users can call functions
- Gas overhead on every call
- Most secure for production

### 2. UUPS (Universal Upgradeable Proxy Standard)
- Upgrade logic in implementation contract
- Lower gas costs
- Implementation must include upgrade functionality

### 3. Beacon Proxy
- Multiple proxies share same implementation
- Efficient for deploying many identical contracts

## Basic Proxy Deployment

### Transparent Proxy

```typescript
export default deployScript(
  async ({ deployViaProxy, namedAccounts }) => {
    const { deployer, admin } = namedAccounts;

    await deployViaProxy(
      "MyContract", // Contract name
      {
        account: deployer,
        artifact: artifacts.Greeter,
        args: ["initialValue"], // Constructor arguments
      },
      {
        owner: admin, // Proxy admin
        proxyContract: "SharedAdminOptimizedTransparentProxy", // Proxy type
      }
    );
  },
  { tags: ["MyContract"] }
);
```

### UUPS Proxy

```typescript
export default deployScript(
  async ({ deployViaProxy, namedAccounts }) => {
    const { deployer, admin } = namedAccounts;

    await deployViaProxy(
      "MyUUPSContract",
      {
        account: deployer,
        artifact: artifacts.MyUUPSContract,
        args: [admin, "initialValue"],
      },
      {
        owner: admin,
        proxyContract: "UUPS", // UUPS proxy type
        execute: "initialize", // Initialization function
      }
    );
  },
  { tags: ["MyUUPSContract"] }
);
```

## Contract Upgrades

### Upgrading Implementation

When you modify your contract and redeploy, hardhat-deploy automatically detects changes and upgrades the implementation:

```typescript
// After modifying your contract source code:
// 1. Recompile: npx hardhat compile
// 2. Redeploy: npx hardhat deploy

// hardhat-deploy will:
// - Detect that the implementation bytecode has changed
// - Deploy a new implementation contract
// - Call upgradeToAndCall (or upgrade) on the proxy
// - Keep the same proxy address and storage
```

### Checking for Upgrades

You can also check if an upgrade is needed before deploying:

```typescript
export default deployScript(
  async ({ deployViaProxy, namedAccounts, get }) => {
    const { deployer, admin } = namedAccounts;

    const result = await deployViaProxy(
      "MyContract",
      {
        account: deployer,
        artifact: artifacts.MyContract,
        args: ["initialValue"],
      },
      {
        owner: admin,
        proxyContract: "SharedAdminOptimizedTransparentProxy",
      }
    );

    if (result.newlyDeployed) {
      console.log("Contract was upgraded or newly deployed");
    } else {
      console.log("Contract unchanged, no upgrade needed");
    }
  },
  { tags: ["MyContract"] }
);
```

## Advanced Proxy Patterns

### Initialization Function

For contracts that need initialization after deployment:

```typescript
export default deployScript(
  async ({ deployViaProxy, namedAccounts }) => {
    const { deployer, admin } = namedAccounts;

    await deployViaProxy(
      "MyContract",
      {
        account: deployer,
        artifact: artifacts.Greeter,
        args: [""], // No constructor args
      },
      {
        owner: admin,
        proxyContract: "SharedAdminOptimizedTransparentProxy",
        execute: {
          methodName: "initialize",
          args: [admin, deployer, 1000], // Initialization parameters
        },
      }
    );
  },
  { tags: ["MyContract"] }
);
```

## Next Steps

- [Deploy Diamond Contracts](./deploy-diamond-contracts.md) for modular upgrades
- [Deployment Fixtures in Tests](./deployment-fixtures-in-tests.md) for testing proxy deployments
