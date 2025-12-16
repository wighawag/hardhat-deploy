# How to Use Viem Integration

Hardhat-deploy provides `@rocketh/viem` a small extension for [Viem](https://viem.sh) that gives you access to a viem client and mechanism to get deployed contracts by name with full type safety.

## Prerequisites

Install the viem extension:

::: code-group

```bash [npm]
npm install -D @rocketh/viem
```

```bash [pnpm]
pnpm add -D @rocketh/viem
```

:::

## Basic Configuration

Add viem support to your `rocketh/config.ts` by importing and spreading the extension:

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
    data: {},
    signerProtocols: {
        privateKey,
    },
} as const satisfies UserConfig;

// this one provide a viem handle to clients and contracts
import * as viemExtension from '@rocketh/viem';

// and export them as a unified object
const extensions = {
	...viemExtension,
};
export {extensions};

// then we also export the types that our config ehibit so other can use it

type Extensions = typeof extensions;
type Accounts = typeof config.accounts;
type Data = typeof config.data;

export type {Extensions, Accounts, Data};
```

## Template Import Pattern

The [template-ethereum-contracts](https://github.com/wighawag/template-ethereum-contracts) shows the clean import pattern:

```typescript
import { deployScript, artifacts } from "../rocketh/deploy.js";

export default deployScript(
  async (env) => {
    // env.viem is now available
    const contract = env.viem.getContract<MyAbi>("ContractName");
  }
);
```

## Viem Environment API

The viem extension adds several utilities to the environment:

### `env.viem.getContract<T>(deployment | name)`

Get a type-safe contract instance from a deployment. if you provide a name only (as opposed to a typed deployment object), you will need to provide the generic type from the generated ABI since `getContract` cannot infer the type from the deployment name alone:

```typescript
import { deployScript, artifacts } from "../rocketh/deploy.js";

export default deployScript(
  async (env) => {
    const { deployer } = env.namedAccounts;

    const deployment = await env.deploy("GreetingsRegistry", {
      account: deployer,
      artifact: artifacts.GreetingsRegistry,
      args: ["Hello, World!"],
    });

    // Get type-safe contract instance from the deployment
    const contract = env.viem.getContract(deployment);

    // Get type-safe contract instance by passing the abi type as generic
    const contract2 = env.viem.getContract<typeof artifacts.GreetingsRegistry.abi>("GreetingsRegistry");
    
    // Type-safe read operations
    const message = await contract.read.messages([deployer]);
    console.log("Current message:", message);
    
    // Get contract info
    console.log("Contract address:", contract.address);
    console.log("Contract ABI available:", !!contract.abi);
  },
  { tags: ["GreetingsRegistry"] }
);
```

### `env.viem.publicClient`

Access the viem public client for network operations:

```typescript
export default deployScript(
  async (env) => {
    const { deployer } = env.namedAccounts;

    // Get network information
    const blockNumber = await env.viem.publicClient.getBlockNumber();
    const chainId = await env.viem.publicClient.getChainId();
    
    console.log(`Deploying on chain ${chainId} at block ${blockNumber}`);

    // Check account balance
    const balance = await env.viem.publicClient.getBalance({
      address: deployer as `0x${string}`,
    });
    
    console.log(`Deployer balance: ${balance} wei`);

    // Deploy contract
    const deployment = await env.deploy("MyContract", {
      account: deployer,
      artifact: artifacts.MyContract,
      args: [],
    });
  },
  { tags: ["MyContract"] }
);
```


## Contract Interactions

### Reading Contract State

Use the type-safe contract instance for reading:

```typescript
export default deployScript(
  async (env) => {
    const { deployer } = env.namedAccounts;

    const deployment = await env.deploy("Counter", {
      account: deployer,
      artifact: artifacts.Counter,
      args: [0],
    });

    const contract = env.viem.getContract(deployment);

    // Type-safe read operations
    const count = await contract.read.count();
    const owner = await contract.read.owner();
    
    console.log(`Count: ${count}`);
    console.log(`Owner: ${owner}`);

    // Read with parameters
    const isAuthorized = await contract.read.isAuthorized([deployer as `0x${string}`]);
    console.log(`Deployer authorized: ${isAuthorized}`);
  },
  { tags: ["Counter"] }
);
```

### Transaction Execution

**Important**: For transaction execution, use `env.execute()` instead of direct viem calls. The `@rocketh/read-execute` extension keeps track of pending transactions, while viem client will not.

```typescript
export default deployScript(
  async (env) => {
    const { deployer, admin } = env.namedAccounts;

    const deployment = await env.deploy("MyToken", {
      account: deployer,
      artifact: artifacts.MyToken,
      args: ["My Token", "MTK"],
    });

    // ✅ RECOMMENDED: Use env.execute() for transactions
    // This tracks pending transactions and handles nonce management
    await env.execute(deployment, {
      functionName: "transfer",
      args: [admin, 1000n],
      account: deployer,
    });

    // ❌ NOT RECOMMENDED: Direct viem wallet client usage
    // This doesn't track pending transactions
    // const contract = env.viem.getContract(deployment);
    // await contract.write.transfer([admin, 1000n], { account: deployer });

    console.log("Transfer completed using env.execute()");
  },
  { tags: ["MyToken"] }
);
```

### Why Use `env.execute()` Over Direct Viem?

The `@rocketh/read-execute` extension provides several advantages:

1. **Pending Transaction Tracking**: Keeps track of pending transactions to avoid nonce conflicts
2. **Deployment Integration**: Works seamlessly with hardhat-deploy's deployment system
3. **Consistent Logging**: Provides consistent transaction logging and receipts

```typescript
// env.execute() handles all of this automatically:
// - Nonce management
// - Gas estimation
// - Transaction tracking
// - Receipt handling
// - Error reporting

await env.execute(deployment, {
  functionName: "setMessage",
  args: ["New message"],
  account: deployer,
  // Optional: gas limit, gas price, etc.
});
```

## Next Steps

- [Write Deploy Scripts](./write-deploy-scripts.md) to see viem integration in deploy scripts
- [Use Fork Testing](./use-fork-testing.md) for testing with existing contracts using viem
- [Use Deployment Fixtures in Tests](./deployment-fixtures-in-tests.md) for comprehensive testing patterns
