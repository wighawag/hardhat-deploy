# Installation

The quickest way to get started with hardhat-deploy is to either

1. use `hardhat-deploy init` command
2. use a more [complete template](https://github.com/wighawag/template-ethereum-contracts)

## Using `hardhat-deploy init`

::: code-group

```bash skip [npm]
npx hardhat-deploy@next init --install my-project
```

```bash [pnpm]
pnpm dlx hardhat-deploy@next init --install my-project
```

:::

Then just cd into the project directory

```bash
# set the current directory
cd my-project
```

And with that you are ready to go!

compile your contracts:

```bash
pnpm hardhat compile
```

And then test deployment against in in-memory node by running:

```bash
pnpm hardhat deploy
```

hardhat-deploy and rocketh provides many features to help you deploy your contracts.

## Migrating from hardhat-deploy v1

in v1 you would create a deploy file like this:

```typescript skip
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

```typescript skip
 namedAccounts: {
    deployer: 0,
    ...
  },
```

in v2 you will do this instead:

```typescript skip
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
  { tags: ["MyContract"] },
);
```

and you would have a `rocketh/config.ts` file as described in the [Setup First Project section](./how-to/setup-first-project.md)

### Migrating existing deployment to hardhat-deploy

> Only needed for an existing project that already deployed contracts and has the deployment information available **(at minimum, address, abi, bytecode and metadata)**
>
> If you come from hardhat-deploy v1, there is nothing you should need to do as hardhat-deploy v2 will read your deployment files as usual.

You might want to switch your current deployment process to use **hardhat-deploy**. In that case you probably have some deployments saved elsewhere.

In order to port them to **hardhat-deploy**, you'll need to create one `.json` file per contract in the `deployments/<environment>` folder.

The environment folder is simply the hardhat network name (as configured in hardhat.config.js).
Such folder need to have a file named `.chain` containing both the chainId as decimal and the genesisHash.
If coming from hardhat-deploy v1, it will also accept a `.chainId` file containing only the chainId but will convert it

For example for an environment named "sepolia" (for the corresponding network) the file `deployments/sepolia/.chain` would be

```json skip
{
  "chainId": "11155111",
  "genesisHash": "0x25a5cc106eea7138acab33231d7160d69cb777ee0c2c553fcddf5138993e6dd9"
}
```

Each contract file must follow this type (as defined in [types.ts](types.ts)) :

```typescript skip
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

- 2 Contract named Greeter and Registry deployed on sepolia
- 1 contract named Greeter on mainnet
- 2 Contract named Greeter and Registry deployed on an environment named sepolia2

You would get the following folder structure:

```text skip
deployments/
  mainnet/
    .chain
    Greeter.json
  sepolia/
    .chain
    Greeter.json
    Registry.json
  sepolia2/
    .chain
    Greeter.json
    Registry.json
```

The reason why **hardhat-deploy** save chainId and genesisHash in the `.chain` file is both for

- safety: so that if you were to change the network name to point to a different chain, it would not attempt to read the wrong folder and assume that a contract has been deployed while it has not.
- ability to know the chainId without requiring to be connected to a node (and so not dependent on hardhat.config.js settings). Useful for `export` task.
