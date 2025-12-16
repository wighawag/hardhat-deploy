# Installation

Here is the basic for getting started

Note: hardhat-deploy is alpha, see `@next` to get alpha version, if you do not specify `@next` you'll get v1

::: code-group

```bash [npm]
npm install -D hardhat-deploy@next rocketh @rocketh/node @rocketh/deploy @rocketh/read-execute
```

```bash [pnpm]
pnpm add -D hardhat-deploy@next rocketh @rocketh/node @rocketh/deploy @rocketh/read-execute
```

:::

Note that both `rocketh` and `@rocketh/node` are necessary


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


Example of `rocketh/config.ts` file:

```typescript
import type {UserConfig} from 'rocketh/types';

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
    data: {}
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

You can them create a deploy script in the `deploy` folder like so:

```typescript
import { deployScript, artifacts } from "../rocketh/deploy.js";

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

and you would have configuration in hardhat.config.ts

```typescript
 namedAccounts: {
    deployer: 0,
    ...
  },
```

in v2 you will do this instead:

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
