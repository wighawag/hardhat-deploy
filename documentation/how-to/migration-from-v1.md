# Migrating from hardhat-deploy v1 to v2

## Overview

hardhat-deploy v2 has significant breaking changes and requires hardhat 3.x. If you're following an old tutorial or have an existing project using v1, this guide will help you migrate.

## Quick Reference

| Aspect | v1 Pattern | v2 Pattern |
|--------|-----------|-----------|
| **Hardhat version** | 2.x | 3.x (specifically `^3.1.5`) |
| **Import style** | `require('hardhat-deploy')` | `import HardhatDeploy from 'hardhat-deploy'` |
| **Config export** | `module.exports = {...}` | `export default defineConfig({...})` |
| **Named accounts** | `namedAccounts` in hardhat.config.ts | `rocketh/config.ts` |
| **Deploy function** | `deployments.deploy(name, {...})` | `deploy(name, {account: ..., artifact: ...})` |
| **Parameter** | `from: address` | `account: address` |
| **Solidity config** | `solidity: "0.8.x"` or `solidity: {version: "..."}` | `solidity: {profiles: {default: {version: "..."}}}` |
| **Destructuring** | `{getNamedAccounts, deployments}` | `{deploy, namedAccounts}` |

## When to Stay on v1

If you have a production project using hardhat-deploy v1, it's often better to stay on v1 rather than migrate. You can install v1 specifically:

```bash
npm uninstall hardhat-deploy
npm install hardhat-deploy@1
```

v1 will continue to receive security fixes but won't get new features.

## Prerequisites

Before migrating, ensure you have:

- Node.js 22+ (v2 requires a newer version than v1)
- hardhat 3.x or later
- TypeScript knowledge (v2 is primarily designed for TypeScript projects)

## Step-by-Step Migration

### Step 1: Update Dependencies

Update your `package.json` to use hardhat 3.x and hardhat-deploy v2:

```json
{
  "devDependencies": {
    "hardhat": "^3.1.5",
    "hardhat-deploy": "^2.0.0",
    "hardhat-deploy-ethers": "^2.0.0",
    "ethers": "^6.0.0"
  }
}
```

Then install:

```bash
pnpm install
```

### Step 2: Convert hardhat.config to ESM

v1 used CommonJS (`require`/`module.exports`), while v2 uses ESM (`import`/`export`).

**v1 (hardhat.config.js):**
```javascript
require('@nomiclabs/hardhat-waffle');
require('hardhat-deploy');
require('@nomiclabs/hardhat-ethers');

module.exports = {
  solidity: "0.8.0",
  namedAccounts: {
    deployer: 0,
  },
};
```

**v2 (hardhat.config.ts):**
```typescript
import { defineConfig } from "hardhat/config";
import HardhatDeploy from "hardhat-deploy";

export default defineConfig({
  plugins: [HardhatDeploy],
  solidity: {
    profiles: {
      default: {
        version: "0.8.28",
      },
    },
  },
});
```

### Step 3: Create rocketh Configuration

In v2, named accounts are configured in a separate `rocketh/config.ts` file.

Create the directory and file:

```bash
mkdir -p rocketh
```

**rocketh/config.ts:**
```typescript
/// ----------------------------------------------------------------------------
// Typed Config
//----------------------------------------------------------------------------
import type { UserConfig } from "rocketh/types";

// we define our config and export it as "config"
export const config = {
  accounts: {
    deployer: {
      default: 0, // Use the first account as deployer
    },
    admin: {
      default: 1, // Use the second account as admin
    },
  },
  data: {},
} as const satisfies UserConfig;

// then we import each extensions we are interested in using in our deploy script or elsewhere

// this one provide a deploy function
import * as deployExtension from "@rocketh/deploy";
// this one provide read,execute functions
import * as readExecuteExtension from "@rocketh/read-execute";

// and export them as a unified object
const extensions = {
  ...deployExtension,
  ...readExecuteExtension,
};
export { extensions };

// then we also export the types that our config exhibit so other can use it

type Extensions = typeof extensions;
type Accounts = typeof config.accounts;
type Data = typeof config.data;

export type { Extensions, Accounts, Data };
```

**rocketh/deploy.ts:**
```typescript
import {
  type Accounts,
  type Data,
  type Extensions,
  extensions,
} from "./config.js";

// ----------------------------------------------------------------------------
// we re-export the artifacts, so they are easily available from the alias
import * as artifacts from "../generated/artifacts/index.js";
export { artifacts };
// ----------------------------------------------------------------------------
// we create the rocketh functions we need by passing the extensions to the
//  setup function
import { setupDeployScripts } from "rocketh";
const { deployScript } = setupDeployScripts<Extensions, Accounts, Data>(
  extensions,
);

export { deployScript };
```

**rocketh/environment.ts:**
```typescript
import {
  type Accounts,
  type Data,
  type Extensions,
  extensions,
} from "./config.js";
import { setupEnvironmentFromFiles } from "@rocketh/node";
import { setupHardhatDeploy } from "hardhat-deploy/helpers";

// useful for test and scripts, uses file-system
const { loadAndExecuteDeploymentsFromFiles } = setupEnvironmentFromFiles<
  Extensions,
  Accounts,
  Data
>(extensions);
const { loadEnvironmentFromHardhat } = setupHardhatDeploy<
  Extensions,
  Accounts,
  Data
>(extensions);

export { loadEnvironmentFromHardhat, loadAndExecuteDeploymentsFromFiles };
```

### Step 4: Convert Deploy Scripts

v1 deploy scripts used a different pattern than v2.

**v1 (deploy/00_deploy_my_contract.js):**
```javascript
module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  
  await deploy("MyContract", {
    from: deployer,
    args: ["Hello"],
    log: true,
  });
};

module.exports.tags = ["MyContract"];
```

**v2 (deploy/deploy_MyContract.ts):**
```typescript
import { deployScript, artifacts } from "../rocketh/deploy.js";

export default deployScript(
  async ({ deploy, namedAccounts }) => {
    const { deployer } = namedAccounts;

    await deploy("MyContract", {
      account: deployer,
      artifact: artifacts.MyContract,
      args: ["Hello"],
    });
  },
  { tags: ["MyContract"] },
);
```

**Key changes:**
- Use `deployScript` wrapper function
- Destructure `{deploy, namedAccounts}` instead of `{getNamedAccounts, deployments}`
- Use `account:` instead of `from:`
- Pass artifact explicitly: `artifact: artifacts.ContractName`
- Tags are passed as second argument instead of `module.exports.tags`

### Step 5: Update Tests

v2 uses a different pattern for test fixtures.

**v1 (test/MyContract.test.js):**
```javascript
const { deployments, ethers } = require('hardhat');

describe('MyContract', () => {
  it('works', async () => {
    await deployments.fixture(['MyContract']);
    const MyContract = await deployments.get('MyContract');
    console.log(MyContract.address);
  });
});
```

**v2 (test/MyContract.test.ts):**
```typescript
import { deployments } from 'hardhat';
import { loadAndExecuteDeploymentsFromFiles } from '../rocketh/environment.js';

describe('MyContract', () => {
  it('works', async () => {
    await loadAndExecuteDeploymentsFromFiles({
      hre,
      tags: ['MyContract'],
    });
    const MyContract = await deployments.get('MyContract');
    console.log(MyContract.address);
  });
});
```

### Step 6: Update package.json Scripts

Update your scripts to match the v2 structure:

```json
{
  "scripts": {
    "compile": "hardhat compile",
    "deploy": "hardhat deploy",
    "test": "hardhat test"
  }
}
```

## Common Migration Patterns

### Pattern 1: Converting Named Accounts

**v1:**
```javascript
module.exports = {
  namedAccounts: {
    deployer: 0,
    tokenOwner: '0x1234...',
  },
};
```

**v2:**
```typescript
// rocketh/config.ts
export const config = {
  accounts: {
    deployer: {
      default: 0,
    },
    tokenOwner: {
      default: '0x1234...',
    },
  },
} as const satisfies UserConfig;
```

### Pattern 2: Converting Deploy Options

**v1:**
```javascript
await deploy("Contract", {
  from: deployer,
  args: [arg1, arg2],
  log: true,
  gasLimit: 2000000,
});
```

**v2:**
```typescript
await deploy("Contract", {
  account: deployer,
  artifact: artifacts.Contract,
  args: [arg1, arg2],
});
```

### Pattern 3: Converting Proxy Deployment

**v1:**
```javascript
await deploy("MyContract", {
  from: deployer,
  proxy: true,
  args: ["initArg"],
});
```

**v2:**
```typescript
// Proxy deployment with @rocketh/proxy
import * as proxyExtension from "@rocketh/proxy";

// Add to extensions in rocketh/config.ts
const extensions = {
  ...deployExtension,
  ...proxyExtension,
};

// Then in deploy script:
await deploy("MyContract", {
  account: deployer,
  artifact: artifacts.MyContract,
  viaProxy: {
    initArgs: ["initArg"],
  },
});
```

## Troubleshooting

### Error: "namedAccounts" is not supported

This means you still have `namedAccounts` in your hardhat.config.ts. Remove it and use rocketh/config.ts instead.

### Error: "deployments.deploy is not a function"

In v2, use `deploy()` directly instead of `deployments.deploy()`. Import it from rocketh/deploy:

```typescript
import { deployScript, artifacts } from "../rocketh/deploy.js";

export default deployScript(
  async ({ deploy, namedAccounts }) => {
    // Use deploy directly
    await deploy("Contract", {...});
  },
  {...}
);
```

### Error: "from is not a valid parameter"

Change `from:` to `account:` in your deploy options.

## Additional Resources

- [hardhat-deploy v2 Documentation](https://rocketh.dev/hardhat-deploy/)
- [Setup First Project](/how-to/setup-first-project.html)
- [Hardhat 3.x Migration Guide](https://hardhat.org/docs/upgrades)
- [Rocketh Documentation](https://github.com/wighawag/rocketh)