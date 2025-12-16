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
npm install -D hardhat-deploy@next rocketh @rocketh/node @rocketh/deploy @rocketh/read-execute
```

```bash [pnpm]
pnpm add -D hardhat-deploy@next rocketh @rocketh/node @rocketh/deploy @rocketh/read-execute
```

Note that both `rocketh` and `@rocketh/node` are necessary.

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
## Step 4: Create rocketh/config.ts Configuration along rocketh/deploy.ts and rocketh/environment.ts

Create a `rocketh` folder and a `rocketh/config.ts` file in your project:

```typescript
// rocketh/config.ts
// ----------------------------------------------------------------------------
// Typed Config
// ----------------------------------------------------------------------------
import type {UserConfig} from 'rocketh/types';

// this one provide a protocol supporting private key as account
import {privateKey} from '@rocketh/signer';


// we define our config and export it as "config"
export const config = {
    accounts: {
        deployer: {
            default: 0,
        },
        admin: {
            default: 1,
        },
    },
    data: {},
    signerProtocols: {
        privateKey,
    },
} as const satisfies UserConfig;

// then we import each extensions we are interested in using in our deploy script or elsewhere

// this one provide a deploy function
import * as deployExtension from '@rocketh/deploy';
// this one provide read,execute functions
import * as readExecuteExtension from '@rocketh/read-execute';
// this one provide a deployViaProxy function that let you declaratively
//  deploy proxy based contracts
import * as deployProxyExtension from '@rocketh/proxy';
// this one provide a viem handle to clients and contracts
import * as viemExtension from '@rocketh/viem';

// and export them as a unified object
const extensions = {
	...deployExtension,
	...readExecuteExtension,
	...deployProxyExtension,
	...viemExtension,
};
export {extensions};

// then we also export the types that our config ehibit so other can use it

type Extensions = typeof extensions;
type Accounts = typeof config.accounts;
type Data = typeof config.data;

export type {Extensions, Accounts, Data};
```

Then add these 2 files in the same folder

- `rocketh/deploy.ts` make use of only `rocketh` and allow deploy script to run in a web runtime if desired.
- `rocketh/environment.ts` make use of `rocketh/node` to read the config file and is export function to be used in tests or scripts

```typescript
// rocketh/deploy.ts
import {type Accounts, type Data, type Extensions, extensions} from './config.js';

// ----------------------------------------------------------------------------
// we re-export the artifacts, so they are easily available from the alias
import * as artifacts from '../generated/artifacts/index.js';
export {artifacts};
// ----------------------------------------------------------------------------
// we create the rocketh functions we need by passing the extensions to the
//  setup function
import {setupDeployScripts} from 'rocketh';
const {deployScript} = setupDeployScripts<Extensions,Accounts,Data>(extensions);

export {deployScript};

```

```typescript
// rocketh/environment.ts
import {type Accounts, type Data, type Extensions, extensions} from './config.js';
import {setupEnvironmentFromFiles} from '@rocketh/node';
import {setupHardhatDeploy} from 'hardhat-deploy/helpers';

// useful for test and scripts, uses file-system
const {loadAndExecuteDeploymentsFromFiles} = setupEnvironmentFromFiles<Extensions,Accounts,Data>(extensions);
const {loadEnvironmentFromHardhat} = setupHardhatDeploy<Extensions,Accounts,Data>(extensions)

export {loadEnvironmentFromHardhat, loadAndExecuteDeploymentsFromFiles};

```

Note that the `./generated` folder will only be present after you compile the contracts (`pnpm hardhat build`).

And you ll probably want to add this folder to your `.gitignore` file

## Step 5: Create Your First Contract

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

## Step 6: Create Deploy Directory

Create a `deploy/` directory in your project root.

## Step 7: Write Your First Deploy Script

Create `deploy/001_deploy_greeter.ts`:

```typescript
import { deployScript, artifacts } from "../rocketh/deploy.js";

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

## Step 8: Compile and Deploy

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

## Step 9: Verify Deployment

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
