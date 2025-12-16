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



## Next Steps

- [Deploy with Proxies](./deploy-with-proxies.md) for alternative upgrade patterns
- [Deployment Fixtures in Tests](./deployment-fixtures-in-tests.md) for testing diamond contracts
