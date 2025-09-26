# How to Set Up Your First Project

This guide walks you through setting up hardhat-deploy in a new project from scratch.

## Prerequisites

- Node.js 18+ installed
- Basic familiarity with Hardhat
- A new or existing [Hardhat project](https://hardhat.org)

For starting a brand new project, check [Hardhat getting started guide](https://hardhat.org/docs/getting-started)

## Step 1: Install Dependencies

Install hardhat-deploy and the core rocketh packages:

::: code-group

```bash [npm]
npm install -D hardhat-deploy@next rocketh @rocketh/deploy @rocketh/read-execute
```

```bash [pnpm]
pnpm add -D hardhat-deploy@next rocketh @rocketh/deploy @rocketh/read-execute
```

:::

## Step 2: Install Optional Extensions

For advanced features like proxies and diamonds:

::: code-group

```bash [npm]
npm install -D @rocketh/proxy @rocketh/diamond @rocketh/export @rocketh/verifier @rocketh/doc
```

```bash [pnpm]
pnpm add -D @rocketh/proxy @rocketh/diamond @rocketh/export @rocketh/verifier @rocketh/doc
```

:::

## Step 3: Configure Hardhat

Add hardhat-deploy to your `hardhat.config.ts`:

```typescript
import HardhatDeploy from 'hardhat-deploy';
import { HardhatUserConfig } from 'hardhat/config';

const config: HardhatUserConfig = {
  plugins: [HardhatDeploy],
  solidity: "0.8.19",
  networks: {
    hardhat: {},
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || "",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
    },
  },
};

export default config;
```

## Step 4: Set Up Import Alias

Choose one of these methods to set up the `#rocketh` alias:

### Option A: Using package.json (Recommended)

Add to your `package.json`:

```json
{
  "imports": {
    "#rocketh": "./rocketh.js"
  }
}
```

You will also want to add the `rootDir` field if not already set, in the `tsconfig.json` to remove ambiguity regarding the import aliases:

```json
{
  "compilerOptions": {
    ...,
    "rootDir": "./"
  }
}
```

### Option B: Using tsconfig.json

Add to your `tsconfig.json`:

```json
{
  "compilerOptions": {
    ...,
    "paths": {
      "#rocketh": ["./rocketh.ts"]
    }
  }
}
```


## Step 5: Create rocketh.ts Configuration

Create a `rocketh.ts` file in your project root:

```typescript
// ------------------------------------------------------------------------------------------------
// Typed Config
// ------------------------------------------------------------------------------------------------
import { UserConfig } from "rocketh";
export const config = {
  accounts: {
    deployer: {
      default: 0, // Use first account by default
    },
    admin: {
      default: 1, // Use second account by default
    },
  },
  data: {},
} as const satisfies UserConfig;

// ------------------------------------------------------------------------------------------------
// Imports and Re-exports
// ------------------------------------------------------------------------------------------------
// Import extensions we need for deploy scripts
import * as deployExtensions from '@rocketh/deploy';
import * as readExecuteExtensions from '@rocketh/read-execute';
const extensions = {...deployExtensions, ...readExecuteExtensions};

// Re-export artifacts for easy access
import * as artifacts from './generated/artifacts/index.js';
export {artifacts};

// ------------------------------------------------------------------------------------------------
// Setup rocketh with extensions
// ------------------------------------------------------------------------------------------------
import {setup} from 'rocketh';
const {deployScript, loadAndExecuteDeployments} = setup<typeof extensions, typeof config.accounts, typeof config.data>(
    extensions,
);

// Setup hardhat-deploy integration
import {setupHardhatDeploy} from 'hardhat-deploy/helpers';
const {loadEnvironmentFromHardhat} = setupHardhatDeploy(extensions);

// Export everything needed for deploy scripts and tests
export {loadAndExecuteDeployments, deployScript, loadEnvironmentFromHardhat};
```


Note that the `./generated` folder will only be present after you compile the contracts (`pnpm hardhat build`).

And you ll probably want to add this folder to your `.gitignore` file

## Step 6: Create Your First Contract

Create a simple contract in `contracts/Greeter.sol`:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract Greeter {
    string public greeting;
    
    constructor(string memory _greeting) {
        greeting = _greeting;
    }
    
    function setGreeting(string memory _greeting) public {
        greeting = _greeting;
    }
    
    function greet() public view returns (string memory) {
        return greeting;
    }
}
```

## Step 7: Create Deploy Directory

Create a `deploy/` directory in your project root.

## Step 8: Write Your First Deploy Script

Create `deploy/001_deploy_greeter.ts`:

```typescript
import { deployScript, artifacts } from "#rocketh";

export default deployScript(
  async ({ deploy, namedAccounts }) => {
    const { deployer } = namedAccounts;

    await deploy("Greeter", {
      account: deployer,
      artifact: artifacts.Greeter,
      args: ["Hello, World!"],
    });
  },
  { tags: ["Greeter"] }
);
```

## Step 9: Compile and Deploy

Compile your contracts:

```bash
npx hardhat compile
```

Deploy to local network:

```bash
npx hardhat deploy
```

Deploy to testnet (e.g., Sepolia):

```bash
npx hardhat --network sepolia deploy
```

## Step 10: Verify Deployment

Check the `deployments/` directory for your deployment files. You should see:

```
deployments/
  hardhat/
    .chain
    Greeter.json
```

## Next Steps

- [Configure Named Accounts](./configure-named-accounts.md) for better account management
- [Use Tags and Dependencies](./use-tags-and-dependencies.md) to organize complex deployments
