# How to Deploy Diamond Contracts

Diamond contracts (EIP-2535) allow you to create modular, upgradeable contracts by organizing functionality into separate facets. This guide shows you how to deploy diamond contracts using hardhat-deploy.

## Prerequisites

Install the diamond extension:

::: code-group

```bash [npm]
npm install -D @rocketh/diamond
```

```bash [pnpm]
pnpm add -D @rocketh/diamond
```

:::

Add it to your `rocketh/config.ts`:

```typescript
import * as diamondExtensions from '@rocketh/diamond';
import * as deployExtensions from '@rocketh/deploy';

const extensions = {...deployExtensions, ...diamondExtensions};
```

## What are Diamond Contracts?

Diamond contracts consist of:
- **Diamond**: The main contract that delegates calls to facets
- **Facets**: Individual contracts containing specific functionality
- **Diamond Storage**: Shared storage accessible by all facets
- **Diamond Cut**: Mechanism to add, replace, or remove facets

## Basic Diamond Deployment

### Simple Diamond with Facets

```typescript
import { deployScript, artifacts } from "../rocketh/deploy.js";

export default deployScript(
  async ({ diamond, namedAccounts }) => {
    const { deployer, admin } = namedAccounts;

    await diamond(
      "GreetingsRegistry", // Diamond name
      {
        account: deployer,
      },
      {
        facets: [
          { artifact: artifacts.GetMessageFacet },
          { artifact: artifacts.SetMessageFacet },
        ],
        facetsArgs: [
          {
            prefix: "Hello, ",
            num: 1,
          },
        ],
        owner: admin,
      }
    );
  },
  { tags: ["GreetingsRegistry", "diamond"] }
);
```

## Upgrading Diamonds

When you modify a facet or add new ones, hardhat-deploy generates the appropriate `diamondCut` automatically:

```typescript
import { deployScript, artifacts } from "../rocketh/deploy.js";

export default deployScript(
  async ({ diamond, namedAccounts }) => {
    const { deployer, admin } = namedAccounts;

    // When you add/modify facets, hardhat-deploy will:
    // - Detect new facets and add them
    // - Detect modified facets and replace them
    // - Detect removed facets and remove them
    await diamond(
      "GreetingsRegistry",
      {
        account: deployer,
      },
      {
        facets: [
          { artifact: artifacts.GetMessageFacet },
          { artifact: artifacts.SetMessageFacet },
          { artifact: artifacts.NewFeatureFacet }, // New facet added
        ],
        facetsArgs: [
          {
            prefix: "Hello, ",
            num: 2, // Updated argument
          },
        ],
        owner: admin,
      }
    );
  },
  { tags: ["GreetingsRegistry", "diamond"] }
);
```

## Diamond Storage Pattern

When writing facets, use the diamond storage pattern to avoid storage collisions:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

library GreetingsStorage {
    bytes32 constant STORAGE_POSITION = keccak256("greetings.storage");

    struct Storage {
        string prefix;
        mapping(address => string) messages;
    }

    function get() internal pure returns (Storage storage s) {
        bytes32 position = STORAGE_POSITION;
        assembly {
            s.slot := position
        }
    }
}
```

## Next Steps

- [Deploy with Proxies](./deploy-with-proxies.md) for alternative upgrade patterns
- [Deployment Fixtures in Tests](./deployment-fixtures-in-tests.md) for testing diamond contracts
