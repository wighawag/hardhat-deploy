# Installation

Here is the basic for getting started

Note: hardhat-deploy is alpha, see `@next` to get alpha version, if you do not specify `@next` you'll get v1

::: code-group

```bash [npm]
npm install -D hardhat-deploy@next rocketh @rocketh/deploy @rocketh/read-execute
```

```bash [pnpm]
pnpm add -D hardhat-deploy@next rocketh @rocketh/deploy @rocketh/read-execute
```

:::


Then you need to add it to the plugins list of hardhat in hardhat.config.ts:

```ts
import HardhatDeploy from 'hardhat-deploy';
...
const config: HardhatUserConfig = {
    plugins: [..., HardhatDeploy],
...
```


We also recommend you add these to provide more features

::: code-group

```bash [npm]
npm install -D @rocketh/proxy @rocketh/diamond @rocketh/export @rocketh/verifier @rocketh/doc
```

```bash [pnpm]
pnpm add -D @rocketh/proxy @rocketh/diamond @rocketh/export @rocketh/verifier @rocketh/doc
```

:::

Note that extensions like `@rocketh/proxy` need to be passed into the rocketh setup function so they can be used.

The best way to do that is actually use the `rocketh.ts/js` config file itself to do that in one place.
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
import * as artifacts from './generated/artifacts.js';
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

In order to port them to **hardhat-deploy**, you'll need to create one `.json` file per contract in the `deployments/<environment>` folder (configurable via [paths config](#extra-paths-config)).

The environment folder is simply the hardhat network name (as configured in hardhat.config.js).
Such folder need to have a file named `.chain` containing both the chainId as decimal and the genesisHash.
If coming from hardhat-deploy v1, it will also accept a `.chainId` file containing only the chainId but will convert it

For example for an environment named "sepolia" (for the corresponding network) the file `deployments/sepolia/.chain` would be

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
- 2 Contract named Greeter and Registry deployed on a environment named rinkeby2

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
