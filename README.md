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

## Table of Content

- [What is it for?](#what-is-it-for)
- [Setup](#setup)
- [Migrating from hardhat-deploy v1](#migrating-from-hardhat-deploy-v1)

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
- contains helpers to read and execute transaction on deployed contract referring to them by name.
- save metadata of deployed contract so they can always be fully verified, via sourcify or etherscan.
- ability to submit contract source to etherscan and sourcify for verification at any time. (Because hardhat-deploy will save all the necessary info, it can be executed at any time.)
- support hardhat's fork feature so deployment can be accessed even when run through fork.
- declarative proxy deployment with ability to upgrade them transparently, only if code changes.
- support HRC (Hot Contract Replacement) via special proxy mechanism

## Setup

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

We recommend to actuall use the `rocketh.ts/js` config file to do that in one place.

if you use typescript, we also recommend you add the to `tsconfig.json` so you can import with `import .. from "@rocketh"` it from anywhere:

```json
{
	"compilerOptions": {
	  ...
		"paths": {
			"@rocketh": ["./rocketh.ts"]
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
// We also added an alias (@rocketh) in tsconfig.json
// so they just need to do `import {execute, artifacts} from '@rocketh';`
// and this work anywhere in the file hierarchy
// ------------------------------------------------------------------------------------------------
// we add here the module we need, so that they are available in the deploy scripts
import "@rocketh/deploy"; // this one provide a deploy function
import "@rocketh/read-execute"; // this one provide read,execute functions
// ------------------------------------------------------------------------------------------------
// we re-export the artifacts, so they are easily available from the alias
import artifacts from "./generated/artifacts.js";
export { artifacts };
// ------------------------------------------------------------------------------------------------
// while not necessary, we also converted the execution function type to know about the named accounts
// this way you get type safe accounts
import {
  execute as _execute,
  loadAndExecuteDeployments,
  type NamedAccountExecuteFunction,
} from "rocketh";
const execute = _execute as NamedAccountExecuteFunction<typeof config.accounts>;
export { execute, loadAndExecuteDeployments };
```

You can them create a deploy script in the `deploy` folder like so:

```typescript
// we import what we need from the @rocketh alias, see ../rocketh.ts
import { execute, artifacts } from "@rocketh";

export default execute(
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
/// we import what we need from the @rocketh alias, see ../rocketh.ts
import { execute, artifacts } from "@rocketh";

export default execute(
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
