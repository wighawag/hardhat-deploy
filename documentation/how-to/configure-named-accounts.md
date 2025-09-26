# How to Configure Named Accounts

Named accounts allow you to define accounts by name and configure them differently per network, making your deploy scripts more readable and flexible.

## What are Named Accounts?

Instead of using `accounts[0]`, `accounts[1]`, etc., you can use meaningful names like `deployer`, `admin`, `treasury`, making your code more maintainable and less error-prone.

## Basic Configuration

Configure named accounts in your `rocketh.ts` file:

```typescript
import { UserConfig } from "rocketh";

export const config = {
  accounts: {
    deployer: {
      default: 0, // Use first account by default
    },
    admin: {
      default: 1, // Use second account by default
    },
    treasury: {
      default: 2, // Use third account by default
    },
  },
} as const satisfies UserConfig;
```

## Network-Specific Configuration

You can override account assignments for specific networks:

```typescript
export const config = {
  accounts: {
    deployer: {
      default: 0,
      sepolia: 1,        // Use second account on Sepolia
      mainnet: "0x1234567890123456789012345678901234567890", // Specific address on mainnet
    },
    admin: {
      default: 1,
      sepolia: 0,        // Use first account on Sepolia
      mainnet: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd", // Specific address on mainnet
    },
    treasury: {
      default: 2,
      mainnet: "0x9876543210987654321098765432109876543210", // Treasury multisig on mainnet
    },
  },
} as const satisfies UserConfig;
```

## Using Named Accounts in Deploy Scripts

Access named accounts in your deploy scripts:

```typescript
import { deployScript, artifacts } from "#rocketh";

export default deployScript(
  async ({ deploy, namedAccounts }) => {
    const { deployer, admin, treasury } = namedAccounts;

    // Deploy contract with deployer account
    const token = await deploy("MyToken", {
      account: deployer,
      artifact: artifacts.MyToken,
      args: ["My Token", "MTK", treasury], // Treasury as initial owner
    });

    // Transfer ownership to admin
    await execute(token, {
      functionName: "transferOwnership",
      args: [admin],
      account: deployer,
    });
  },
  { tags: ["MyToken"] }
);
```


## Using Named Accounts in Tests

Named accounts are also available in your test fixtures:

```typescript
import { setupFixtures } from './utils/index.js';

const { deployAll } = setupFixtures(provider);

describe('MyContract', function () {
  it('should work with named accounts', async function () {
    const { env, MyContract, namedAccounts } = await networkHelpers.loadFixture(deployAll);
    const { deployer, admin, alice, bob } = namedAccounts;

    // Use named accounts in tests
    await env.execute(MyContract, {
      functionName: "transfer",
      args: [bob, 1000],
      account: alice,
    });
  });
});
```


## Next Steps

- [Use Tags and Dependencies](./use-tags-and-dependencies.md) for organizing deployments
- [Deploy with Proxies](./deploy-with-proxies.md) for upgradeable contracts
