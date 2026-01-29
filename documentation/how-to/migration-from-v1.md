# Migrating from hardhat-deploy v1 to v2

## Overview

hardhat-deploy v2 has significant breaking changes and requires hardhat 3.x. If you're following an old tutorial or have an existing project using v1, this guide will help you migrate.

v2 introduces:
- **ESM modules** (no more CommonJS `require`/`module.exports`)
- **Rocketh integration** for deployment management
- **Modular configuration** (split into multiple files)
- **Enhanced TypeScript support**
- **Better extensibility** through rocketh extensions

> **Note**: For a complete working example of a hardhat-deploy v2 project, see the [template-ethereum-contracts](https://github.com/wighawag/template-ethereum-contracts) repository.

## Quick Reference

| Aspect | v1 Pattern | v2 Pattern |
|--------|-----------|-----------|
| **Hardhat version** | 2.x | 3.x (specifically `^3.1.5`) |
| **Module system** | CommonJS (`require`/`module.exports`) | ESM (`import`/`export`) |
| **Named accounts** | `namedAccounts` in hardhat.config.ts | `rocketh/config.ts` |
| **Deploy function** | `deployments.deploy(name, {...})` | `deploy(name, {account: ..., artifact: ...})` |
| **Deployer param** | `from: address` | `account: address` |
| **Solidity config** | `solidity: "0.8.x"` or `solidity: {version: "..."}` | `solidity: {profiles: {default: {version: "..."}}}` |
| **Test fixtures** | `deployments.createFixture()` | Custom fixture with `loadAndExecuteDeploymentsFromFiles()` |
| **Contract interaction** | `ethers.getContract()` | `env.get()` + `env.execute()` |

## When to Stay on v1

If you have a production project using hardhat-deploy v1, it's often better to stay on v1 rather than migrate. You can install v1 specifically:

```bash
npm uninstall hardhat-deploy
npm install hardhat-deploy@1
```

v1 will continue to receive security fixes but won't get new features.

## Prerequisites

Before migrating, ensure you have:

- **Node.js 22+** (v2 requires a newer version than v1)
- **hardhat 3.x or later**
- **TypeScript knowledge** (v2 is primarily designed for TypeScript projects)

## Step-by-Step Migration

### Step 1: Update Dependencies

Update your [`package.json`](https://github.com/wighawag/template-ethereum-contracts/blob/main/contracts/package.json) to use hardhat 3.x and hardhat-deploy v2:

**v1 package.json example:**
```json
{
  "devDependencies": {
    "hardhat": "^2.22.18",
    "hardhat-deploy": "^0.14.0",
    "hardhat-deploy-ethers": "^0.4.2",
    "hardhat-deploy-tenderly": "^1.0.0",
    "ethers": "^6.13.5"
  }
}
```

**v2 package.json example:**
```json
{
  "type": "module",
  "devDependencies": {
    "hardhat": "^3.1.4",
    "hardhat-deploy": "^2.0.0-next.66",
    "rocketh": "^0.17.15",
    "@rocketh/deploy": "^0.17.9",
    "@rocketh/read-execute": "^0.17.9",
    "@rocketh/node": "^0.17.18",
    "@rocketh/proxy": "^0.17.13",
    "viem": "^2.45.0",
    "@nomicfoundation/hardhat-viem": "^3.0.1",
    "@nomicfoundation/hardhat-node-test-runner": "^3.0.8",
    "@nomicfoundation/hardhat-network-helpers": "^3.0.3",
    "@nomicfoundation/hardhat-keystore": "^3.0.3"
  }
}
```

**Key changes:**
1. Add `"type": "module"` at the top level
2. Update `hardhat` to `^3.1.4` or higher
3. Update `hardhat-deploy` to `^2.0.0-next.66` or higher
4. Remove `hardhat-deploy-ethers` and `hardhat-deploy-tenderly`
5. Add rocketh packages and viem
6. Add Hardhat 3.x plugins

Then install:

```bash
pnpm install
```

### Step 2: Convert hardhat.config to ESM

v1 used CommonJS (`require`/`module.exports`), while v2 uses ESM (`import`/`export`).

**v1 hardhat.config.ts example:**
```typescript
import 'dotenv/config';
import {HardhatUserConfig} from 'hardhat/types';

import '@nomicfoundation/hardhat-chai-matchers';
import '@nomicfoundation/hardhat-ethers';
import '@typechain/hardhat';

import 'hardhat-deploy';
import 'hardhat-deploy-ethers';
import 'hardhat-deploy-tenderly';

import {node_url, accounts, addForkConfiguration} from './utils/network';

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: '0.8.17',
        settings: {
          optimizer: {
            enabled: true,
            runs: 2000,
          },
        },
      },
    ],
  },
  namedAccounts: {
    deployer: 0,
    simpleERC20Beneficiary: 1,
  },
  networks: addForkConfiguration({
    hardhat: {
      initialBaseFeePerGas: 0,
    },
    localhost: {
      url: node_url('localhost'),
      accounts: accounts(),
    },
    mainnet: {
      url: node_url('mainnet'),
      accounts: accounts('mainnet'),
    },
    sepolia: {
      url: node_url('sepolia'),
      accounts: accounts('sepolia'),
    },
  }),
  paths: {
    sources: 'src',
  },
  mocha: {
    timeout: 0,
  },
  external: process.env.HARDHAT_FORK
    ? {
        deployments: {
          hardhat: ['deployments/' + process.env.HARDHAT_FORK],
          localhost: ['deployments/' + process.env.HARDHAT_FORK],
        },
      }
    : undefined,
};

export default config;
```

**v2 hardhat.config.ts example:** (see [template-ethereum-contracts/hardhat.config.ts](https://github.com/wighawag/template-ethereum-contracts/blob/main/contracts/hardhat.config.ts))
```typescript
import type {HardhatUserConfig} from 'hardhat/config';

import HardhatNodeTestRunner from '@nomicfoundation/hardhat-node-test-runner';
import HardhatViem from '@nomicfoundation/hardhat-viem';
import HardhatNetworkHelpers from '@nomicfoundation/hardhat-network-helpers';
import HardhatKeystore from '@nomicfoundation/hardhat-keystore';

import HardhatDeploy from 'hardhat-deploy';
import {
  addForkConfiguration,
  addNetworksFromEnv,
  addNetworksFromKnownList,
} from 'hardhat-deploy/helpers';

const config: HardhatUserConfig = {
  plugins: [
    HardhatNodeTestRunner,
    HardhatViem,
    HardhatNetworkHelpers,
    HardhatKeystore,
    HardhatDeploy,
  ],
  solidity: {
    profiles: {
      default: {
        version: '0.8.17',
      },
      production: {
        version: '0.8.17',
        settings: {
          optimizer: {
            enabled: true,
            runs: 999999,
          },
        },
      },
    },
  },
  networks:
    addForkConfiguration(
      addNetworksFromKnownList(
        addNetworksFromEnv(
          {
            default: {
              type: 'edr-simulated',
              chainType: 'l1',
              accounts: {
                mnemonic: process.env.MNEMONIC || undefined,
              },
            },
          },
        ),
      ),
    ),
  paths: {
    sources: ['src'],
  },
  generateTypedArtifacts: {
    destinations: [
      {
        folder: './generated',
        mode: 'typescript',
      },
    ],
  },
};

export default config;
```

**Key changes:**
- Change from `import 'hardhat-deploy'` to `import HardhatDeploy from 'hardhat-deploy'`
- Remove `namedAccounts` section entirely
- Convert `solidity.compilers` to `solidity.profiles`
- Add `plugins` array with imported plugins
- Use helper functions from `hardhat-deploy/helpers` for network configuration
- Delete `utils/network.ts` file (no longer needed)
- Add `generateTypedArtifacts` configuration

### Step 3: Create rocketh Configuration

In v2, named accounts are configured in a separate [`rocketh/config.ts`](https://github.com/wighawag/template-ethereum-contracts/blob/main/contracts/rocketh/config.ts) file.

Create the directory and files:

```bash
mkdir -p rocketh
```

**rocketh/config.ts example:** (see [template-ethereum-contracts/rocketh/config.ts](https://github.com/wighawag/template-ethereum-contracts/blob/main/contracts/rocketh/config.ts))
```typescript
// ----------------------------------------------------------------------------
// Typed Config
// ----------------------------------------------------------------------------
import type {
  EnhancedEnvironment,
  UnknownDeployments,
  UserConfig,
} from 'rocketh/types';

// this one provide a protocol supporting private key as account
import {privateKey} from '@rocketh/signer';

// we define our config and export it as "config"
export const config = {
  accounts: {
    deployer: {
      default: 0,
    },
    simpleERC20Beneficiary: {
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
type Environment = EnhancedEnvironment<
  Accounts,
  Data,
  UnknownDeployments,
  Extensions
>;

export type {Extensions, Accounts, Data, Environment};
```

**rocketh/deploy.ts example:** (see [template-ethereum-contracts/rocketh/deploy.ts](https://github.com/wighawag/template-ethereum-contracts/blob/main/contracts/rocketh/deploy.ts))
```typescript
import {
  type Accounts,
  type Data,
  type Extensions,
  extensions,
} from './config.js';

// ----------------------------------------------------------------------------
// we re-export the artifacts, so they are easily available from the alias
import * as artifacts from '../generated/artifacts/index.js';
export {artifacts};
// ----------------------------------------------------------------------------
// we create the rocketh functions we need by passing the extensions to the
//  setup function
import {setupDeployScripts} from 'rocketh';
const {deployScript} = setupDeployScripts<Extensions, Accounts, Data>(
  extensions,
);

export {deployScript};
```

**rocketh/environment.ts example:** (see [template-ethereum-contracts/rocketh/environment.ts](https://github.com/wighawag/template-ethereum-contracts/blob/main/contracts/rocketh/environment.ts))
```typescript
import {
  type Accounts,
  type Data,
  type Extensions,
  extensions,
} from './config.js';
import {setupEnvironmentFromFiles} from '@rocketh/node';
import {setupHardhatDeploy} from 'hardhat-deploy/helpers';

// useful for test and scripts, uses file-system
const {loadAndExecuteDeploymentsFromFiles} = setupEnvironmentFromFiles<
  Extensions,
  Accounts,
  Data
>(extensions);
const {loadEnvironmentFromHardhat} = setupHardhatDeploy<
  Extensions,
  Accounts,
  Data
>(extensions);

export {loadEnvironmentFromHardhat, loadAndExecuteDeploymentsFromFiles};
```

### Step 4: Convert Deploy Scripts

v1 deploy scripts used a different pattern than v2.

**v1 deploy script example:**
```typescript
import {HardhatRuntimeEnvironment} from 'hardhat/types';
import {DeployFunction} from 'hardhat-deploy/types';
import {parseEther} from 'ethers';

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployments, getNamedAccounts} = hre;
  const {deploy} = deployments;

  const {deployer, simpleERC20Beneficiary} = await getNamedAccounts();

  await deploy('SimpleERC20', {
    from: deployer,
    args: [simpleERC20Beneficiary, parseEther('1000000000')],
    log: true,
    autoMine: true,
  });
};
export default func;
func.tags = ['SimpleERC20'];
```

**v2 deploy script example:** (see [template-ethereum-contracts/deploy/001_deploy_greetings_registry.ts](https://github.com/wighawag/template-ethereum-contracts/blob/main/contracts/deploy/001_deploy_greetings_registry.ts))
```typescript
import {deployScript, artifacts} from '../rocketh/deploy.js';
import {parseEther} from 'viem';

export default deployScript(
  async (env) => {
    const {deployer, simpleERC20Beneficiary} = env.namedAccounts;

    await env.deploy('SimpleERC20', {
      artifact: artifacts.SimpleERC20,
      account: deployer,
      args: [simpleERC20Beneficiary, parseEther('1000000000')],
    });
  },
  {
    tags: ['SimpleERC20'],
  },
);
```

**Key changes:**
- Remove `HardhatRuntimeEnvironment` and `DeployFunction` imports
- Import `deployScript` and `artifacts` from `../rocketh/deploy.js`
- Change `parseEther` from `ethers` to `viem`
- Wrap function in `deployScript()` call
- Change parameter from `(hre)` to `(env)`
- Replace `hre.getNamedAccounts()` with direct `env.namedAccounts` access
- Replace `hre.deployments.deploy()` with `env.deploy()`
- Change `from:` to `account:`
- Add explicit `artifact:` parameter
- Remove `log:` and `autoMine:` parameters (not needed in v2)
- Move tags to second argument object

#### Proxy Deployment Example

**v1 proxy deploy script example:**
```typescript
const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const {deployer} = await hre.getNamedAccounts();
  const {deploy} = hre.deployments;
  const useProxy = !hre.network.live;

  await deploy('GreetingsRegistry', {
    from: deployer,
    proxy: useProxy && 'postUpgrade',
    args: [2],
    log: true,
    autoMine: true,
  });

  return !useProxy;
};
export default func;
func.id = 'deploy_greetings_registry';
func.tags = ['GreetingsRegistry'];
```

**v2 proxy deploy script example:** (see [template-ethereum-contracts/deploy/002_deploy_greetings_registry.ts](https://github.com/wighawag/template-ethereum-contracts/blob/main/contracts/deploy/002_deploy_greetings_registry.ts))
```typescript
import {deployScript, artifacts} from '../rocketh/deploy.js';

export default deployScript(
  async (env) => {
    const {deployer} = env.namedAccounts;
    const useProxy = !env.tags.live;

    await env.deployViaProxy(
      'GreetingsRegistry',
      {
        account: deployer,
        artifact: artifacts.GreetingsRegistry,
        args: ['2'],
      },
      {
        proxyDisabled: !useProxy,
        execute: 'postUpgrade',
      },
    );

    return !useProxy;
  },
  {
    tags: ['GreetingsRegistry'],
    id: 'deploy_greetings_registry',
  },
);
```

### Step 5: Update Tests

v2 uses a different pattern for test fixtures.

**v1 test example:**
```typescript
import {expect} from 'chai';
import {ethers, deployments, getUnnamedAccounts, getNamedAccounts} from 'hardhat';
import {IERC20} from '../typechain-types';
import {setupUser, setupUsers} from './utils';

const setup = deployments.createFixture(async () => {
  await deployments.fixture('SimpleERC20');
  const {simpleERC20Beneficiary} = await getNamedAccounts();
  const contracts = {
    SimpleERC20: await ethers.getContract<IERC20>('SimpleERC20'),
  };
  const users = await setupUsers(await getUnnamedAccounts(), contracts);
  return {
    ...contracts,
    users,
    simpleERC20Beneficiary: await setupUser(simpleERC20Beneficiary, contracts),
  };
});

describe('SimpleERC20', function () {
  it('transfer fails', async function () {
    const {users} = await setup();
    await expect(users[0].SimpleERC20.transfer(users[1].address, 1)).to.be.revertedWith('NOT_ENOUGH_TOKENS');
  });

  it('transfer succeed', async function () {
    const {users, simpleERC20Beneficiary, SimpleERC20} = await setup();
    await simpleERC20Beneficiary.SimpleERC20.transfer(users[1].address, 1);

    await expect(simpleERC20Beneficiary.SimpleERC20.transfer(users[1].address, 1))
      .to.emit(SimpleERC20, 'Transfer')
      .withArgs(simpleERC20Beneficiary.address, users[1].address, 1);
  });
});
```

**v2 test example:** (see [template-ethereum-contracts/test/GreetingsRegistry.test.ts](https://github.com/wighawag/template-ethereum-contracts/blob/main/contracts/test/GreetingsRegistry.test.ts))
```typescript
import {expect} from 'earl';
import {describe, it} from 'node:test';
import {network} from 'hardhat';
import {EthereumProvider} from 'hardhat/types/providers';
import {loadAndExecuteDeploymentsFromFiles} from '../rocketh/environment.js';
import {Abi_SimpleERC20} from '../generated/abis/SimpleERC20.js';

function setupFixtures(provider: EthereumProvider) {
  return {
    async deployAll() {
      const env = await loadAndExecuteDeploymentsFromFiles({
        provider: provider,
      });

      const SimpleERC20 = env.get<Abi_SimpleERC20>('SimpleERC20');

      return {
        env,
        SimpleERC20,
        namedAccounts: env.namedAccounts,
        unnamedAccounts: env.unnamedAccounts,
      };
    },
  };
}

const {provider, networkHelpers} = await network.connect();
const {deployAll} = setupFixtures(provider);

describe('SimpleERC20', function () {
  it('transfer fails', async function () {
    const {env, SimpleERC20, unnamedAccounts} =
      await networkHelpers.loadFixture(deployAll);

    await expect(
      env.execute(SimpleERC20, {
        account: unnamedAccounts[0],
        functionName: 'transfer',
        args: [unnamedAccounts[1], 1n],
      }),
    ).toBeRejectedWith('NOT_ENOUGH_TOKENS');
  });

  it('transfer succeed', async function () {
    const {env, SimpleERC20, unnamedAccounts, namedAccounts} =
      await networkHelpers.loadFixture(deployAll);

    await env.execute(SimpleERC20, {
      account: namedAccounts.simpleERC20Beneficiary,
      functionName: 'transfer',
      args: [unnamedAccounts[1], 1n],
    });
  });
});
```

**Key changes:**
- Change test runner from `mocha` to `node:test` (or keep mocha if preferred)
- Change assertion library from `chai` to `earl` (or keep chai if preferred)
- Import `network` from 'hardhat'
- Create custom fixture function using `loadAndExecuteDeploymentsFromFiles()`
- Replace `deployments.createFixture()` with custom fixture
- Replace `ethers.getContract()` with `env.get<Abi_Type>()`
- Import ABI types from generated artifacts
- Replace `getUnnamedAccounts()` with `env.unnamedAccounts`
- Replace contract method calls with `env.execute()`
- Use `BigInt` literals (1n) instead of Numbers (1) for amounts
- Use `networkHelpers.loadFixture()` instead of direct fixture call

### Step 6: Update Scripts

**v1 script pattern:**
```typescript
import hre from 'hardhat';

async function main() {
  const {deployments, getNamedAccounts} = hre;
  const {deployer} = await getNamedAccounts();
  
  const MyContract = await deployments.get('MyContract');
  const contract = await ethers.getContractAt('MyContract', MyContract.address);
  
  await contract.someFunction();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
```

**v2 script pattern:**
```typescript
import hre from 'hardhat';
import {loadEnvironmentFromHardhat} from './rocketh/environment.js';
import {Abi_MyContract} from './generated/abis/MyContract.js';

async function main() {
  const env = await loadEnvironmentFromHardhat({hre});
  
  const MyContract = env.get<Abi_MyContract>('MyContract');
  
  await env.execute(MyContract, {
    account: env.namedAccounts.deployer,
    functionName: 'someFunction',
    args: [],
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
```

### Step 7: Update package.json Scripts

**v1 package.json scripts example:**
```json
{
  "scripts": {
    "prepare": "hardhat typechain",
    "compile": "hardhat compile",
    "void:deploy": "hardhat deploy --report-gas",
    "test": "cross-env HARDHAT_DEPLOY_FIXTURE=true HARDHAT_COMPILE=true mocha --bail --recursive test",
    "gas": "cross-env REPORT_GAS=true hardhat test",
    "coverage": "cross-env HARDHAT_DEPLOY_FIXTURE=true hardhat coverage",
    "dev:node": "cross-env MINING_INTERVAL=\"3000,5000\" hardhat node --hostname 0.0.0.0",
    "dev": "cross-env MINING_INTERVAL=\"3000,5000\" hardhat node --hostname 0.0.0.0 --watch",
    "local:dev": "hardhat --network localhost deploy --watch",
    "execute": "node ./_scripts.js run",
    "deploy": "node ./_scripts.js deploy",
    "verify": "node ./_scripts.js verify",
    "export": "node ./_scripts.js export"
  }
}
```

**v2 package.json scripts example:** (see [template-ethereum-contracts/package.json](https://github.com/wighawag/template-ethereum-contracts/blob/main/contracts/package.json))
```json
{
  "scripts": {
    "prepare": "set-defaults .vscode && pnpm compile",
    "local_node": "ldenv -d localhost hardhat node",
    "compile": "hardhat compile",
    "compile:watch": "as-soon -w src pnpm compile",
    "fork:execute": "ldenv tsx @=HARDHAT_FORK=@@MODE @@",
    "fork:deploy": "pnpm compile --build-profile production && ldenv hardhat @=HARDHAT_FORK=@@MODE deploy @@",
    "deploy:dev": "ldenv -d localhost pnpm :deploy+export @@",
    "deploy:watch": "wait-on ./generated && ldenv -m localhost pnpm as-soon -w generated -w deploy pnpm run deploy:dev @@MODE @@",
    "test": "hardhat test",
    "test:watch": "wait-on ./generated && as-soon -w generated -w test hardhat test --no-compile",
    "typescript:watch": "as-soon -w js pnpm typescript",
    "format:check": "prettier --check .",
    "format": "prettier --write .",
    "lint": "slippy src/**/*.sol",
    "docgen": "ldenv -m default pnpm run deploy @@MODE --save-deployments true --skip-prompts ~~ pnpm rocketh-doc -e @@MODE --except-suffix _Implementation,_Proxy,_Router,_Route ~~ @@",
    "execute": "ldenv -n HARDHAT_NETWORK tsx @@",
    "deploy": "pnpm compile --build-profile production && ldenv hardhat --network @@MODE deploy @@",
    "verify": "ldenv rocketh-verify -e @@MODE @@",
    "export": "ldenv rocketh-export -e @@MODE @@",
    "typescript": "tsc"
  }
}
```

**Key changes:**
- Remove `hardhat typechain` (no longer needed, artifacts generated automatically)
- Update test command to use `hardhat test`
- Remove `_scripts.js` patterns
- Use `ldenv` for environment-aware commands
- Add `compile:watch` using `as-soon`
- Add `deploy:watch` using `as-soon` and `wait-on`
- Use rocketh commands: `rocketh-verify`, `rocketh-export`, `rocketh-doc`
- Add `typescript` script for TypeScript compilation

## Common Migration Patterns

### Pattern 1: Converting Named Accounts

**v1:**
```typescript
namedAccounts: {
  deployer: 0,
  tokenOwner: '0x1234...',
}
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
```typescript
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
```typescript
await deploy("MyContract", {
  from: deployer,
  proxy: useProxy && 'postUpgrade',
  args: [initArg],
});
```

**v2:**
```typescript
await env.deployViaProxy(
  "MyContract",
  {
    account: deployer,
    artifact: artifacts.MyContract,
    args: [initArg],
  },
  {
    proxyDisabled: !useProxy,
    execute: "postUpgrade",
  },
);
```

### Pattern 4: Contract Interaction in Tests

**v1:**
```typescript
const MyContract = await ethers.getContract("MyContract");
await MyContract.setValue(42);
const value = await MyContract.getValue();
expect(value).to.equal(42);
```

**v2:**
```typescript
import {Abi_MyContract} from '../generated/abis/MyContract.js';

const MyContract = env.get<Abi_MyContract>("MyContract");
await env.execute(MyContract, {
  account: env.namedAccounts.deployer,
  functionName: 'setValue',
  args: [42n],
});
const value = await env.read(MyContract, {
  functionName: 'getValue',
  args: [],
});
expect(value).toEqual(42n);
```

## Troubleshooting

### Error: "namedAccounts is not supported"

**Cause**: You still have `namedAccounts` in your hardhat.config.ts file.

**Solution**: Remove the `namedAccounts` section from hardhat.config.ts and move it to [`rocketh/config.ts`](https://github.com/wighawag/template-ethereum-contracts/blob/main/contracts/rocketh/config.ts):

```typescript
// hardhat.config.ts - REMOVE THIS
namedAccounts: {
  deployer: 0,
  admin: 1,
},

// rocketh/config.ts - ADD THIS
export const config = {
  accounts: {
    deployer: {
      default: 0,
    },
    admin: {
      default: 1,
    },
  },
} as const satisfies UserConfig;
```

### Error: "deployments.deploy is not a function"

**Cause**: In v2, `deploy` is available directly in the environment, not through `deployments`.

**Solution**: Change your deploy script to use the new pattern:

**Before (v1)**:
```typescript
const {deploy} = hre.deployments;
await deploy("Contract", {...});
```

**After (v2)**:
```typescript
import {deployScript, artifacts} from '../rocketh/deploy.js';

export default deployScript(
  async ({deploy}) => {
    await deploy("Contract", {
      artifact: artifacts.Contract,
      account: deployer,
      args: [],
    });
  },
  {},
);
```

### Error: "from is not a valid parameter"

**Cause**: v2 uses `account:` instead of `from:`.

**Solution**: Change all `from:` parameters to `account:`:

**Before**:
```typescript
await deploy("Contract", {
  from: deployer,
  args: [],
});
```

**After**:
```typescript
await deploy("Contract", {
  account: deployer,
  args: [],
});
```

### Error: Import errors with .js extensions

**Cause**: ESM modules require explicit file extensions for local imports.

**Solution**: Add `.js` extension to all local imports:

**Before**:
```typescript
import {deployScript, artifacts} from '../rocketh/deploy';
import {loadEnvironmentFromHardhat} from './rocketh/environment';
```

**After**:
```typescript
import {deployScript, artifacts} from '../rocketh/deploy.js';
import {loadEnvironmentFromHardhat} from './rocketh/environment.js';
```

### Error: Type errors with artifacts

**Cause**: v2 uses explicit ABI types from generated artifacts.

**Solution**: Import ABI types and use them with `env.get()`:

**Before**:
```typescript
const MyContract = await ethers.getContract("MyContract");
```

**After**:
```typescript
import {Abi_MyContract} from '../generated/abis/MyContract.js';
const MyContract = env.get<Abi_MyContract>("MyContract");
```

### Error: "HardhatDeploy is not a constructor"

**Cause**: Incorrect import of HardhatDeploy plugin.

**Solution**: Use default import:

**Before**:
```typescript
import {HardhatDeploy} from 'hardhat-deploy';
```

**After**:
```typescript
import HardhatDeploy from 'hardhat-deploy';
```

## Migration Checklist

Use this checklist to verify your migration is complete and working correctly.

### Dependencies
- [ ] Updated package.json with `"type": "module"`
- [ ] Updated `hardhat` to version 3.x or higher
- [ ] Updated `hardhat-deploy` to version 2.x or higher
- [ ] Removed `hardhat-deploy-ethers` and `hardhat-deploy-tenderly`
- [ ] Added `rocketh` package
- [ ] Added `@rocketh/deploy`, `@rocketh/read-execute`, `@rocketh/node`
- [ ] Added `@rocketh/proxy` (if using proxies)
- [ ] Added `viem` package
- [ ] Added Hardhat 3.x plugins
- [ ] Ran `pnpm install` successfully

### Configuration
- [ ] Converted hardhat.config.ts to use `export default`
- [ ] Removed `namedAccounts` from hardhat.config.ts
- [ ] Imported `HardhatDeploy` from 'hardhat-deploy'
- [ ] Added plugins array with all required plugins
- [ ] Converted solidity config to use profiles
- [ ] Used helper functions for network configuration
- [ ] Added `generateTypedArtifacts` configuration
- [ ] Deleted `utils/network.ts` file
- [ ] Created `rocketh/config.ts` with named accounts
- [ ] Added extensions to rocketh/config.ts
- [ ] Created `rocketh/deploy.ts` with deployScript setup
- [ ] Created `rocketh/environment.ts` with environment setup

### Deploy Scripts
- [ ] Converted all deploy scripts to use `deployScript` wrapper
- [ ] Changed from `(hre)` to `(env)` parameter
- [ ] Replaced `hre.getNamedAccounts()` with `env.namedAccounts`
- [ ] Changed `from:` to `account:` in all deploy calls
- [ ] Added explicit `artifact:` parameter to all deploy calls
- [ ] Removed `log:` and `autoMine:` parameters
- [ ] Moved tags to second argument object
- [ ] Converted proxy deployments to use `env.deployViaProxy()`
- [ ] Imported artifacts from `../rocketh/deploy.js`

### Tests
- [ ] Updated test imports
- [ ] Created custom fixture functions
- [ ] Replaced `deployments.createFixture()` with custom fixtures
- [ ] Imported ABI types from generated artifacts
- [ ] Replaced `ethers.getContract()` with `env.get<Abi_Type>()`
- [ ] Replaced `getUnnamedAccounts()` with `env.unnamedAccounts`
- [ ] Converted contract method calls to `env.execute()`
- [ ] Updated test utilities

### Scripts
- [ ] Imported `loadEnvironmentFromHardhat` from rocketh/environment
- [ ] Imported ABI types from generated artifacts
- [ ] Replaced direct HRE access with `loadEnvironmentFromHardhat()`
- [ ] Converted contract method calls to `env.execute()`

### Package.json Scripts
- [ ] Removed `hardhat typechain` command
- [ ] Updated test command to use `hardhat test`
- [ ] Removed `_scripts.js` patterns
- [ ] Added `ldenv` commands for environment-aware operations
- [ ] Added watch commands using `as-soon`
- [ ] Added rocketh commands: `rocketh-verify`, `rocketh-export`, `rocketh-doc`
- [ ] Added TypeScript compilation script

### Verification
- [ ] Ran `npx hardhat compile` successfully
- [ ] Ran `npx hardhat deploy` on local network successfully
- [ ] Ran `npx hardhat test` successfully
- [ ] Verified deployments in `deployments/` directory
- [ ] Verified generated artifacts in `generated/` directory
- [ ] Tested on test network (if applicable)
- [ ] Verified contract interactions work correctly
- [ ] Checked type errors with `tsc --noEmit`

## Additional Resources

- [hardhat-deploy v2 Documentation](https://rocketh.dev/hardhat-deploy/)
- [Setup First Project](./setup-first-project.md)
- [Hardhat 3.x Migration Guide](https://hardhat.org/docs/upgrades)
- [Rocketh Documentation](https://github.com/wighawag/rocketh)
- [AI Migration Guide](https://github.com/wighawag/hardhat-deploy/blob/main/plans/migration-v1-to-v2.md) - Comprehensive AI-focused migration guide
- [template-ethereum-contracts](https://github.com/wighawag/template-ethereum-contracts) - Complete working example using v2