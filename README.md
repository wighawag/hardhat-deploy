<h1> hardhat-deploy</h1>

_A [Hardhat](https://hardhat.org) Plugin For Replicable Deployments And Easy Testing_

> **Note: This is the documentation for hardhat-deploy v2 that works with [hardhat v3](https://hardhat.org/hardhat3-alpha)**
>
> Documentation for hardhat-deploy v1 can be found on the [v1 branch](https://github.com/wighawag/hardhat-deploy/tree/v1#readme)

**hardhat-deploy** make it easy for you to deploy your EVM smart contracts across many chains.

The version 2 is a full rewrite that has been already used in production for several years. It does not support yet all the features of version 1 but is fully modular and it is thus much easier to contribute to new deployment mechanism.

Under the hood, hardhat-deploy uses [rocketh](https://github.com/wighawag/rocketh) a framework agnostic system that provide a minimal api to save and load deployment.

Everything else is handled by external module. For example `@rocketh/deploy` give you a deploy function that you can use to deploy contracts.
But you can provide your own module for advanced use case.

There are already a few like `@rocketh/proxy` to deploy proxy declaratively like in hardhat-deploy v1 or `@rocketh/diamond` to deploy diamond declaratively.

## What is it for?

This hardhat plugin adds a mechanism to deploy contracts to any network, keeping track of them and replicating the same environment for testing.

It also adds a mechanism to associate names to addresses, so test and deployment scripts can be reconfigured by simply changing the address a name points to, allowing different configurations per network. This also results in much clearer tests and deployment scripts (no more accounts[0] in your code).

This plugin contains a lot more features too, all geared toward a better developer experience :

- chain configuration export (via @rocketh/export)
  (listing deployed contracts' addresses and their abis (useful for web apps))
- library linking at the time of deployment.
- deterministic deployment across networks.
- support for specific deploy script per network (L1 vs L2 for example)
- deployment dependency system (allowing you to only deploy what is needed).
- deployment retrying (by saving pending tx): so you can feel confident when making a deployment that you can always recover.
- deployments as test fixture via hardhat helpers
- contains helpers to read and execute transaction on deployed contract referring to them by name.
- save metadata of deployed contract so they can always be fully verified, via sourcify or etherscan.
- ability to submit contract source to etherscan and sourcify for verification at any time. (Because hardhat-deploy will save all the necessary info, it can be executed at any time.)
- support hardhat's fork feature so deployment can be accessed even when run through fork.
- declarative proxy deployment with ability to upgrade them transparently, only if code changes.
- this include support for [openzeppelin](https://openzeppelin.com) transparent proxies
- diamond deployment with facets, allowing you to focus on what the new version will be. It will generate the diamondCut necessary to reach the new state.
- support HRC (Hot Contract Replacement) via special proxy mechanism and file watch setup

## hardhat-deploy in a nutshell

Before going into the details, here is a very simple summary of the basic feature of **hardhat-deploy**.

**hardhat-deploy** allows you to write [`deploy scripts`](#deploy-scripts) in the `deploy` folder. Each of these files that look as follows will be executed in turn when you execute the following task: `hardhat --network <networkName> deploy`

```js
// we import what we need from the #rocketh alias, see below for setup
import { deployScript, artifacts } from "#rocketh";

export default deployScript(
  // this allow us to define our deploy function which takes as first argument an environment object
  // This contaisn the function provided by the modules imported in 'rocketh.ts'
  // along with other built-in functions and the named accounts
  async ({ deployViaProxy, namedAccounts }) => {
    const { deployer, admin } = namedAccounts;

    const prefix = "proxy:";
    await deployViaProxy(
      "GreetingsRegistry",
      {
        account: deployer,
        artifact: artifacts.GreetingsRegistry,
        args: [prefix],
      },
      {
        owner: admin,
        linkedData: {
          prefix,
          admin,
        },
      }
    );
  },
  // execute takes as a second argument an options object where you can specify tags and dependencies
  { tags: ["GreetingsRegistry", "GreetingsRegistry_deploy"] }
);
```

Furthermore you can also ensure these scripts are executed in test too by calling `await loadAndExecuteDeployments({provider: provider,});` in your tests.

Amd you can call these in hardhat test fixture to benefit from caching optimization.

This is a huge benefit for testing since you are not required to replicate the deployment procedure in your tests. The tag feature (as seen in the script above) and [dependencies](#deploy-scripts-tags-and-dependencies) will also make your life easier when writing complex deployment procedures.

You can even group deploy scripts in different sub-folders and ensure they are executed in their logical order.

## Installation

Here is the basic for getting started

Note: hardhat-deploy is alpha, see @next to get alpha version, if you do not specify @nextyou'll get v1

::: code-group

```bash [npm]
npm install -D hardhat-deploy@next rocketh @rocketh/deploy @rocketh/read-execute
```

```bash [pnpm]
pnpm add -D hardhat-deploy@next rocketh @rocketh/deploy @rocketh/read-execute
```

:::

but you can also add these that provide more features

::: code-group

```bash [npm]
npm install -D @rocketh/proxy @rocketh/diamond @rocketh/export @rocketh/verifier @rocketh/doc
```

```bash [pnpm]
pnpm add -D @rocketh/proxy @rocketh/diamond @rocketh/export @rocketh/verifier @rocketh/doc
```

:::

Then you need import them in your deploy script.

But we recommend you import them in one location that you then import in your deploy script so you can share it to all of them.

We recommend to actually use the `rocketh.ts/js` config file to do that in one place.
We also recommend you setup an alias for it  so you can import with `import .. from "#rocketh"` it from anywhere:
You can set it up by settings imports in `package.json`


```json
{
...
"imports": {
		"#rocketh": "./rocketh.js",
	},
}
```

Alternatively if you use typescript, you can instead use `tsconfig.json`

```json
{
	"compilerOptions": {
	  ...
		"paths": {
			"#rocketh": ["./rocketh.ts"]
		}
	}
}
```

Example of `rocketh.ts` file:

```typescript
// ------------------------------------------------------------------------------------------------
// Typed Config
// ------------------------------------------------------------------------------------------------
import { UserConfig } from "rocketh";
export const config = {
  accounts: {
    deployer: {
      default: 0,
    },
  },
} as const satisfies UserConfig;

// ------------------------------------------------------------------------------------------------
// Imports and Re-exports
// ------------------------------------------------------------------------------------------------
// We regroup all what is needed for the deploy scripts
// so that they just need to import this file
// we add here the extension we need, so that they are available in the deploy scripts
// extensions are simply function that accept as their first argument the Environment
// by passing them to the setup function (see below) you get to access them through the environment object with type-safety
import * as deployExtensions from '@rocketh/deploy'; // this one provide a deploy function
import * as readExecuteFunctions from '@rocketh/read-execute'; // this one provide read,execute functions
const extensions = {...deployExtensions, ...readExecuteExtensions};
// ------------------------------------------------------------------------------------------------
// we re-export the artifacts, so they are easily available from the alias
import artifacts from './generated/artifacts.js';
export {artifacts};
// ------------------------------------------------------------------------------------------------
// we create the rocketh function we need by passing the extensions
import {setup} from 'rocketh';
const {deployScript, loadAndExecuteDeployments} = setup<typeof extensions, typeof config.accounts, typeof config.data>(
	extensions,
);
// ------------------------------------------------------------------------------------------------
// we do the same for hardhat-deploy
import {setupHardhatDeploy} from 'hardhat-deploy/helpers';
const {loadEnvironmentFromHardhat} = setupHardhatDeploy(extensions);
// ------------------------------------------------------------------------------------------------
// finally we export them
export {loadAndExecuteDeployments, deployScript, loadEnvironmentFromHardhat};
```

You can them create a deploy script in the `deploy` folder like so:

```typescript
// we import what we need from the #rocketh alias, see ../rocketh.ts
import { deployScript, artifacts } from "#rocketh";

export default deployScript(
  async ({ deploy, namedAccounts }) => {
    const { deployer } = namedAccounts;

    await deploy("GreetingsRegistry", {
      account: deployer,
      artifact: artifacts.GreetingsRegistry,
      args: [""],
    });
  },
  // finally you can pass tags and dependencies
  { tags: ["GreetingsRegistry", "GreetingsRegistry_deploy"] }
);
```

See a template that uses **hardhat-deploy** here: https://github.com/wighawag/template-ethereum-contracts

## Migrating from hardhat-deploy v1

in v1 you would create a deploy file like this:

```typescript
// deploy/00_deploy_my_contract.js
// export a function that get passed the Hardhat runtime environment
module.exports = async ({ getNamedAccounts, deployments }) => {
  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();
  await deploy("MyContract", {
    from: deployer,
    args: ["Hello"],
    log: true,
  });
};
// add tags and dependencies
module.exports.tags = ["MyContract"];
```

and you would have configuraiton in hardhat.config.ts

```typescript
 namedAccounts: {
    deployer: 0,
    ...
  },
```

in v2 you will do this instead:

```typescript
/// we import what we need from the #rocketh alias, see ../rocketh.ts
import { deployScript, artifacts } from "#rocketh";

export default deployScript(
  async ({ deploy, namedAccounts }) => {
    const { deployer } = namedAccounts;

    await deploy("MyContract", {
      account: deployer,
      artifact: artifacts.MyContract,
      args: ["Hello"],
    });
  },
  // finally you can pass tags and dependencies
  { tags: ["MyContract"] }
);
```

and you would have a `rocketh.ts/js` file as described in the [Setup](#setup)

### Migrating existing deployment to hardhat-deploy

> Only needed for an existing project that already deployed contracts and has the deployment information available **(at minimum, address, abi, bytecode and metadata)**
>
> If you come from hardhat-deploy v1, there is nothing you should need to do as hardhat-deploy v2 will read your deployment files as usual.

You might want to switch your current deployment process to use **hardhat-deploy**. In that case you probably have some deployments saved elsewhere.

In order to port them to **hardhat-deploy**, you'll need to create one `.json` file per contract in the `deployments/<network>` folder (configurable via [paths config](#extra-paths-config)).

The network folder is simply the hardhat network name (as configured in hardhat.config.js).
Such folder need to have a file named `.chain` containing both the chainId as decimal and the genesisHash.
If coming from hardhat-deploy v1, it will also accept a `.chainId` file containing only the chainId but will convert it

For example for a network named "sepolia" (for the corresponding network) the file `deployments/rinkeby/.chain` would be

```
{"chainId":"11155111","genesisHash":"0x25a5cc106eea7138acab33231d7160d69cb777ee0c2c553fcddf5138993e6dd9"}
```

Each contract file must follow this type (as defined in [types.ts](types.ts)) :

```typescript
export type Deployment<TAbi extends Abi> = {
  readonly address: EIP1193Account;
  readonly abi: Narrow<TAbi>;
  readonly transaction?: {
    readonly hash: EIP1193DATA;
    readonly origin?: EIP1193Account;
    readonly nonce?: EIP1193DATA;
  };
  readonly receipt?: {
    confirmations: number;
    blockHash: EIP1193DATA;
    blockNumber: EIP1193QUANTITY;
    transactionIndex: EIP1193QUANTITY;
  };
  readonly bytecode: EIP1193DATA;
  readonly argsData: EIP1193DATA;
  readonly metadata: string;
  readonly numDeployments?: number;
  readonly libraries?: Libraries;
  readonly linkedData?: any; // TODO
  readonly deployedBytecode?: EIP1193DATA;
  readonly linkReferences?: any; // TODO
  readonly deployedLinkReferences?: any; // TODO
  readonly contractName?: string;
  readonly sourceName?: string; // relative path
  readonly devdoc?: DevDoc;
  readonly evm?: {
    readonly gasEstimates?: GasEstimates | null;
  } & any;
  readonly storageLayout?: StorageLayout;
  readonly userdoc?: UserDoc;
} & Record<string, unknown>;
```

As you can see, not all fields are mandatory. But having the other fields allow more feature. For example, metadata and args allow you to benefit from contract code verification.

Here is an example:

Let's say you have:

- 2 Contract named Greeter and Registry deployed on rinkeby
- 1 contract named Greeter on mainnet
- 2 Contract named Greeter and Registry deployed on a network named rinkeby2

You would get the following folder structure:

```
deployments/
  mainnet/
    .chain
    Greeter.json
  rinkeby/
    .chain
    Greeter.json
    Registry.json
  rinkeby2/
    .chain
    Greeter.json
    Registry.json
```

The reason why **hardhat-deploy** save chainId and genesisHash in the `.chain` file is both for

- safety: so that if you were to change the network name to point to a different chain, it would not attempt to read the wrong folder and assume that a contract has been deployed while it has not.
- ability to know the chainId without requiring to be connected to a node (and so not dependent on hardhat.config.js settings). Useful for `export` task.

## Hardhat Tasks Available/Updated

hardhat deploy currently add one task to hardhat. But since hardhat-deploy is now just a tiny wrapper arround rocketh, you can use rocketh commands too

### 1. hardhat deploy

This plugin adds the _deploy_ task to Hardhat.

This task will execute the scripts in the `deploy` folder and save the contract deployments to disk. These deployments are supposed to be saved for example in a git repository. This way they can be accessed later. But you are free to save them elsewhere and get them back via your mechanism of choice.

With the deployment saved, it allows you to deploy a contract only if changes were made.

Deploy scripts (also called Deploy functions) can also perform arbitrary logic.

For further details on how to use it and write deploy script, see [section](#deploy-scripts) below.

### 2. rocketh-verify

This command is provided by the optional package `@rocketh/verify`

This command will submit the contract source and other info of all deployed contracts to allow services like etherscan, blockscout or sourcify to verify and record the sources.

To execute that command, you need to specify the network to run against :

```bash
pnpm rocketh-verify -n <network-name> <etherscan|sourcify|blockscout>
```

### 3. rocketh-export

This command is provided by the optional package `@rocketh/export`

This command will export the contract deployed (saved in `deployments` folder) to a file with a simple format containing only contract addresses and abi, useful for web apps.

One of the following options need to be set for this task to have any effects :

```bash
rocketh-export -n <network-name> --ts <path-to-contracts.ts>
```

## Environment object and extension

Each deploy function is given a environment object as first argument.

it contains at least the following fields :

```typescript
export interface Environment<
  NamedAccounts extends UnresolvedUnknownNamedAccounts = UnresolvedUnknownNamedAccounts,
  Deployments extends UnknownDeployments = UnknownDeployments
> {
  network: {
    chain: Chain;
    name: string;
    tags: { [tag: string]: boolean };
    provider: TransactionHashTracker;
  };
  namedAccounts: ResolvedNamedAccounts<NamedAccounts>;
  namedSigners: ResolvedNamedSigners<ResolvedNamedAccounts<NamedAccounts>>;
  unnamedAccounts: EIP1193Account[];
  addressSigners: { [name: `0x${string}`]: Signer };
  save<TAbi extends Abi = Abi>(
    name: string,
    deployment: Deployment<TAbi>,
    options?: { doNotCountAsNewDeployment?: boolean }
  ): Promise<Deployment<TAbi>>;
  savePendingDeployment<TAbi extends Abi = Abi>(
    pendingDeployment: PendingDeployment<TAbi>
  ): Promise<Deployment<TAbi>>;
  savePendingExecution(
    pendingExecution: PendingExecution
  ): Promise<EIP1193TransactionReceipt>;
  get<TAbi extends Abi>(name: string): Deployment<TAbi>;
  getOrNull<TAbi extends Abi>(name: string): Deployment<TAbi> | null;
  fromAddressToNamedABI<TAbi extends Abi>(
    address: Address
  ): { mergedABI: TAbi; names: string[] };
  fromAddressToNamedABIOrNull<TAbi extends Abi>(
    address: Address
  ): { mergedABI: TAbi; names: string[] } | null;
  showMessage(message: string): void;
  showProgress(message?: string): ProgressIndicator;
  hasMigrationBeenDone(id: string): boolean;
}
```

And it is expanded by each module you import like `@rocketh/deploy` which adds a deploy function

## Configuration

Configuration of network or other hardhat specific config is done via hardhat.config.ts

Else rocketh.ts/js is where you can configure hardhat-deploy/rocketh specific configs.

### **1. namedAccounts (ability to name addresses)**

The rocketh.js file need to export a config object

For example

```js
import {UserConfig} from 'rocketh';
export const config = {
	accounts: {
		deployer: {
			default: 0,
      sepolia: 1
		},
		admin: {
			default: 1,
		},
	},
} as const satisfies UserConfig;

import artifacts from './generated/artifacts.js';
export {artifacts};
```

This config file import modules too so that deploy script can simply import rocketh.js to have access to artifacts and specifc environment functions

The named account feature allow you to define accounts by name and have them configurable by network

In the above file, the deployer is set to be the first account on all network, except for sepolia where it is the second

### **4. deterministicDeployment (ability to specify a deployment factory)**

---

The config also allow you to set an optional `deterministicDeployment` field.

`deterministicDeployment` allows you to associate information that are used on each network for deterministic deployment. The information for each deterministic deployment consist out of a `factory`, a `deployer`, the required `funding` and a `signedTx` to deploy the factory. The default deterministic deployment used is the [Deterministic Deployment Proxy](https://github.com/Arachnid/deterministic-deployment-proxy). The factory expects a 32 bytes `salt` concatenated with the deployment data (see [EIP-1014](https://eips.ethereum.org/EIPS/eip-1014) for more information on these parameters).

Using the `deterministicDeployment` it is possible to define a different setup for the deterministic deployment. One use case for this is the deterministic deployment on networks that required replay protection (such as Celo or Avalanche). The [Deterministic Deployment Proxy](https://github.com/Arachnid/deterministic-deployment-proxy) can only be deployed on networks that don't enforce replay protection, therefore on other networks an alternative library has to be used. An example for this would be the [Safe Singleton Factory](https://github.com/gnosis/safe-singleton-factory) that is an adjusted version of the [Deterministic Deployment Proxy](https://github.com/Arachnid/deterministic-deployment-proxy) that contains signed transactions that include replay protection.

```js
import {UserConfig} from 'rocketh';
export const config = {
	accounts: {
		deployer: {
			default: 0,
      sepolia: 1
		},
		admin: {
			default: 1,
		},
	},
  networks: {
    sepolia: {
        factory: '0x4e59b44847b379578588920ca78fbf26c0b4956c',
        deployer: '0x3fab184622dc19b6109349b94811493bf2a45362',
        funding: '10000000000000000',
        signedTx:
          '0xf8a58085174876e800830186a08080b853604580600e600039806000f350fe7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe03601600081602082378035828234f58015156039578182fd5b8082525050506014600cf31ba02222222222222222222222222222222222222222222222222222222222222222a02222222222222222222222222222222222222222222222222222222222222222',
      }
  }
} as const satisfies UserConfig;
```

## How to Deploy Contracts

---

### The `deploy` Task

`hardhat --network <networkName> deploy`

This is a new task that the `hardhat-deploy` adds. As the name suggests it deploys contracts.
To be exact it will look for files in the folder `deploy`

It will scan for files in alphabetical order and execute them in turn.

- it will `import` each of these files and execute the exported function

To specify the network, you can use the builtin hardhat argument `--network <network name>`

> :warning: Note that running `hardhat deploy` without specifying a network will use the default network. If the default network is hardhat (the default's default) then nothing will happen as a result as everything happens in memory, but this can be used to ensure the deployment is without issues.

---

### Deploy Scripts

The deploy scripts need to call the execute function exported by `rocketh`

The execute expect as first argument a function

For example this script will deploy the `GreetingsRegistry` contract

```typescript
import { deployScript, artifacts } from "#rocketh";
export default deployScript(
  async ({ deploy, namedAccounts }) => {
    const { deployer } = namedAccounts;

    await deploy("GreetingsRegistry", {
      account: deployer,
      artifact: artifacts.GreetingsRegistry,
      args: [""],
    });
  },

  { tags: ["GreetingsRegistry", "GreetingsRegistry_deploy"] }
);
```

The tags is a list of string that when the _deploy_ task is executed with, the script will be executed (unless it skips). In other word if the deploy task is executed with a tag that does not belong to that script, that script will not be executed unless it is a dependency of a script that does get executed.

The dependencies is a list of tag that will be executed if that script is executed. So if the script is executed, every script whose tag match any of the dependencies will be executed first.

Finally the function can return true if it wishes to never be executed again. This can be useful to emulate migration scripts that are meant to be executed only once. Once such script return true (async), the `id` field is used to track execution and if that field is not present when the script return true, it will fails.

In other words, if you want a particular deploy script to run only once, it needs to both return true (async) and have an `id` set.

In any case, as a general advice every deploy function should be idempotent. This is so they can always recover from failure or pending transaction. This is what underpin most of hardhat-deploy philosophy.

This is why the `deploy` function provided by `@rocketh/deploy` will by default only deploy if the contract code has changed, making it easier to write idempotent script.

### Environment and function provided by rocketh modules

By default rocketh environment only provide function to read and write deployments. It has no `deploy` function on its own.

These are provided by external modules but few are already available like `@rocketh/deploy`, `@rocketh/proxy` and `@rocketh/diamond` each with its own specific use case.

#### `@rocketh/deploy`

#### `@rocketh/proxy`

#### `@rocketh/diamond`

## Handling contract using libraries

In the deploy function, one of the `DeployOptions` field is the `libraries` field. It allows you to associate external contract as libraries at the time of deployment.

First, you have deploy the library using the `deploy` function, then when we deploy a contract that needs the linked library, we can pass the deployed library name and address in as an argument to the `libraries` object.

First step: deploy the library:

```js
const exampleLibrary = await deploy("ExampleLibary", {
  artifact: artifacts.ExampleLibary,
    from: <deployer>
});

```

ExampleLibrary is now deployed to whatever network was chosen (`hardhat deploy --network <networkName>`)

For example, if we are deploying on Sepolia, this library will get deployed on sepolia, and the `exampleLibrary` variable will be a deployment object that contains the abi as well as the deployed address for the contract.

Now that the library is deployed, we can link it in our next deployed contract.

```js
const example = await deploy(
  "Example",
  {
    account: deployer,
    artifact: artifacts.Example,
    args: ["example string argument for the 'Example' contract constructor"],
  },
  {
    libraries: {
      ExampleLibrary: exampleLibrary.address,
    },
  }
);
```

This `libraries` object takes the name of the library, and its deployed address on the network. Multiple libraries can be passed into the `libraries` object.
