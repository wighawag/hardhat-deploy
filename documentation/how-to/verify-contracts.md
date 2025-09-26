# How to Verify Contracts

Contract verification allows others to view and interact with your contract source code on block explorers. This guide shows you how to verify contracts deployed with hardhat-deploy.

## Prerequisites

Install the verification extension:

::: code-group

```bash [npm]
npm install -D @rocketh/verifier
```

```bash [pnpm]
pnpm add -D @rocketh/verifier
```

:::

## Supported Services

hardhat-deploy supports verification on:
- **Etherscan** (and compatible explorers like Polygonscan, BSCScan)
- **Sourcify** (decentralized verification)
- **Blockscout** (open-source explorer)

## Basic Verification

### Etherscan Verification

Set up your API key in environment variables:

```bash
# .env
ETHERSCAN_API_KEY=your_etherscan_api_key_here
```

Verify all deployed contracts:

```bash
pnpm rocketh-verify -e sepolia etherscan
```

### Sourcify Verification

Sourcify doesn't require an API key:

```bash
pnpm rocketh-verify -e sepolia sourcify
```

### Blockscout Verification

For custom Blockscout instances:

```bash
pnpm rocketh-verify -e sepolia blockscout --endpoint https://eth-sepolia.blockscout.com/api/v2
```


## Next Steps

- [Export Deployments for Frontend](./export-deployments.md) to integrate with web applications
