# How to Export Deployments for Frontend

Exporting deployments creates frontend-friendly files containing contract addresses and ABIs, making it easy to integrate your deployed contracts with web applications.

## Prerequisites

Install the export extension:

::: code-group

```bash [npm]
npm install -D @rocketh/export
```

```bash [pnpm]
pnpm add -D @rocketh/export
```

:::

## Basic Export

### TypeScript Export

Export deployments as a TypeScript file:

```bash
pnpm rocketh-export -e localhost --ts src/contracts.ts
```

This creates a file like:

```typescript
// src/contracts.ts
export default {
  "chain": {
    "id": 31337,
    "name": "Hardhat",
    "nativeCurrency": {
      "decimals": 18,
      "name": "Ether",
      "symbol": "ETH"
    },
    "rpcUrls": {
      "default": {
        "http": ["http://127.0.0.1:8545"]
      }
    },
    "genesisHash": "0x0078bf1c86dfafc8610927cdb57a15bf17005156777f4c4a0c4b2efa8ec1d27f",
    "properties": {}
  },
  "contracts": {
    "Greeter": {
      "abi": [
        {
          "inputs": [{ "internalType": "string", "name": "_greeting", "type": "string" }],
          "stateMutability": "nonpayable",
          "type": "constructor"
        },
        {
          "inputs": [],
          "name": "greet",
          "outputs": [{ "internalType": "string", "name": "", "type": "string" }],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [{ "internalType": "string", "name": "_greeting", "type": "string" }],
          "name": "setGreeting",
          "outputs": [],
          "stateMutability": "nonpayable",
          "type": "function"
        }
        // ... more ABI entries
      ],
      "address": "0xdc64a140aa3e981100a9beca4e685f962f0cf6c9",
      "startBlock": 6
    },
    // ... more contracts (MyContract, DefaultProxyAdmin, etc.)
  },
  "name": "localhost"
} as const;
```

The exported file includes:
- **Chain information**: Chain ID, name, native currency, and RPC URLs
- **Contract data**: For each deployed contract:
  - Full ABI for type-safe interactions
  - Deployed address
  - Block number when the contract was deployed

## Using Exported Contracts in Frontend

```typescript
import contracts from './contracts.js';
import { createPublicClient, http } from 'viem';

// Create a viem client
const client = createPublicClient({
  chain: {
    id: contracts.chain.id,
    name: contracts.chain.name,
    nativeCurrency: contracts.chain.nativeCurrency,
    rpcUrls: contracts.chain.rpcUrls,
  },
  transport: http(),
});

// Read from a contract
const greeting = await client.readContract({
  address: contracts.contracts.Greeter.address,
  abi: contracts.contracts.Greeter.abi,
  functionName: 'greet',
});
```

