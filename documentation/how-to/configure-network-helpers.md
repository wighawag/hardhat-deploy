# How to Configure Networks with Hardhat-Deploy Helpers

Hardhat-deploy provides powerful helper functions that automatically generate network configurations from environment variables and known chain lists. This eliminates the need to manually configure each network in your `hardhat.config.ts`.

## Overview

Hardhat-deploy provides three key helper functions that work together:

```typescript
import {
  addForkConfiguration,
  addNetworksFromEnv,
  addNetworksFromKnownList,
} from 'hardhat-deploy/helpers';
```

These helpers automatically:
- Configure networks from environment variables
- Add all known chains with standard naming
- Set up fork configurations for testing
- Handle account management with mnemonics or private keys

## Helper Functions

### 1. `addNetworksFromEnv`

Scans environment variables for `ETH_NODE_URI_<network>` patterns and automatically creates network configurations.

#### How it Works

```typescript
// Looks for environment variables like:
// ETH_NODE_URI_sepolia=https://sepolia.infura.io/v3/YOUR-PROJECT-ID
// ETH_NODE_URI_polygon=https://polygon-mainnet.infura.io/v3/YOUR-PROJECT-ID
// MNEMONIC_sepolia=your mnemonic here
// MNEMONIC_polygon=your mnemonic here

const networks = addNetworksFromEnv({
  // Your custom networks here
  localhost: {
    type: 'edr-simulated',
    chainType: 'l1',
  },
});
```

#### Environment Variable Patterns

```bash
# Network RPC URLs
ETH_NODE_URI_sepolia=https://sepolia.infura.io/v3/YOUR-PROJECT-ID
ETH_NODE_URI_polygon=https://polygon-mainnet.infura.io/v3/YOUR-PROJECT-ID
ETH_NODE_URI_arbitrum=https://arb1.arbitrum.io/rpc

# Network-specific mnemonics
MNEMONIC_sepolia=your testnet mnemonic here
MNEMONIC_polygon=your polygon mnemonic here

# Fallback mnemonic (used if network-specific not found)
MNEMONIC=your default mnemonic here

# Secret management (uses Hardhat's configVariable)
ETH_NODE_URI_mainnet=SECRET
MNEMONIC_mainnet=SECRET
```

#### Secret Management

For production deployments, use Hardhat's secret management:

```bash
# Set environment variable to "SECRET" to use configVariable
ETH_NODE_URI_mainnet=SECRET
MNEMONIC_mainnet=SECRET

# Or specify custom secret name
ETH_NODE_URI_mainnet=SECRET:MAINNET_RPC_URL
MNEMONIC_mainnet=SECRET:MAINNET_MNEMONIC
```

This will use `configVariable('SECRET_ETH_NODE_URI_mainnet')` or `configVariable('SECRET_MAINNET_RPC_URL')`.

### 2. `addNetworksFromKnownList`

Automatically adds configurations for all known blockchain networks using their kebab-case names.

#### How it Works

```typescript
// Adds networks for all known chains using kebab-case names:
// ethereum, polygon, arbitrum, optimism, base, arbitrum-sepolia, etc.
const networks = addNetworksFromKnownList(
  addNetworksFromEnv({
    // Your custom networks
  })
);
```

#### Network Name Conversion

Network names are converted from their display names to kebab-case:
- **"Arbitrum Sepolia"** → `arbitrum-sepolia`
- **"MegaETH Testnet"** → `mega-eth-testnet`
- **"Polygon Mumbai"** → `polygon-mumbai`

**Important**: Environment variables use underscores instead of dashes (since dashes aren't allowed in env var names):
- Network name: `arbitrum-sepolia`
- Environment variable: `ETH_NODE_URI_arbitrum_sepolia`
- Environment variable: `MNEMONIC_arbitrum_sepolia`

#### Supported Networks

The helper includes configurations for major networks:
- **Ethereum**: `ethereum` (mainnet)
- **Layer 2s**: `polygon`, `arbitrum`, `optimism`, `base`
- **Testnets**: `sepolia`, `goerli`, `mumbai`, `arbitrum-sepolia`
- **Other chains**: `bsc`, `avalanche`, `fantom`, and many more

#### Automatic Configuration

For each known network, it automatically sets:
- **Chain ID**: Correct chain ID for the network
- **RPC URL**: Default public RPC or your custom `ETH_NODE_URI_<network>`
- **Accounts**: Network-specific mnemonic or fallback
- **Chain Type**: L1, L2, or OP-stack classification

### 3. `addForkConfiguration`

Enables fork testing by automatically configuring the `fork` network based on the `HARDHAT_FORK` environment variable.

#### How it Works

```typescript
const networks = addForkConfiguration(
  addNetworksFromKnownList(
    addNetworksFromEnv({
      // Base networks
    })
  )
);
```

#### Fork Environment Variables

```bash
# Fork mainnet at latest block
HARDHAT_FORK=ethereum

# Fork at specific block number
HARDHAT_FORK=ethereum
HARDHAT_FORK_NUMBER=18500000

# Fork other networks
HARDHAT_FORK=polygon
HARDHAT_FORK=arbitrum
```

#### Fork Network Configuration

The helper automatically:
- Creates a `fork` network configuration
- Uses the target network's RPC URL for forking
- Copies account configuration from the target network
- Sets up proper forking parameters

## Complete Configuration Example

Here's how the template uses all three helpers together:

```typescript
// hardhat.config.ts
import { HardhatUserConfig } from 'hardhat/config';
import HardhatDeploy from 'hardhat-deploy';
import {
  addForkConfiguration,
  addNetworksFromEnv,
  addNetworksFromKnownList,
} from 'hardhat-deploy/helpers';

const config: HardhatUserConfig = {
  plugins: [HardhatDeploy],
  solidity: {
    version: '0.8.28',
    settings: {
      optimizer: {
        enabled: true,
        runs: 999999,
      },
    },
  },
  networks:
    // Step 3: Add fork configuration for chosen network
    addForkConfiguration(
      // Step 2: Add network config for all known chains using kebab-case names
      // Uses MNEMONIC_<network> (or MNEMONIC if not set) for accounts
      // Uses ETH_NODE_URI_<network> for RPC URLs
      addNetworksFromKnownList(
        // Step 1: Add networks for each ETH_NODE_URI_<network> env var found
        // Also reads MNEMONIC_<network> to populate accounts
        addNetworksFromEnv(
          // Base configuration - your custom networks
          {
            default: {
              type: 'edr-simulated',
              chainType: 'l1',
            },
          }
        )
      )
    ),
  paths: {
    sources: ['src'],
  },
};

export default config;
```

## Environment Variable Setup

### Development Environment

```bash
# .env.local (not committed)
ETH_NODE_URI_sepolia=https://sepolia.infura.io/v3/YOUR-PROJECT-ID
ETH_NODE_URI_polygon=https://polygon-mainnet.infura.io/v3/YOUR-PROJECT-ID
MNEMONIC_sepolia=your testnet mnemonic here
MNEMONIC_polygon=your polygon mnemonic here

# For fork testing
HARDHAT_FORK=ethereum
```

### Production Environment

```bash
# Production environment variables
ETH_NODE_URI_ethereum=SECRET
ETH_NODE_URI_polygon=SECRET
MNEMONIC_ethereum=SECRET
MNEMONIC_polygon=SECRET
```

With corresponding Hardhat configuration variables:

```bash
# Hardhat configuration variables (secure)
SECRET_ETH_NODE_URI_ethereum=https://mainnet.infura.io/v3/YOUR-PROJECT-ID
SECRET_ETH_NODE_URI_polygon=https://polygon-mainnet.infura.io/v3/YOUR-PROJECT-ID
SECRET_MNEMONIC_ethereum=your production mnemonic here
SECRET_MNEMONIC_polygon=your production mnemonic here
```

## Advanced Usage

### Custom Network with Helpers

```typescript
const config: HardhatUserConfig = {
  networks: addForkConfiguration(
    addNetworksFromKnownList(
      addNetworksFromEnv({
        // Custom local network
        localhost: {
          type: 'edr-simulated',
          chainType: 'l1',
        },
        // Custom testnet
        'custom-testnet': {
          type: 'http',
          url: 'https://rpc.custom-testnet.com',
          chainId: 12345,
          accounts: { mnemonic: 'your custom testnet mnemonic' },
        },
      })
    )
  ),
};
```

### Network-Specific Configuration

```typescript
// The helpers automatically handle network-specific settings
// Based on environment variables:

// ETH_NODE_URI_arbitrum=https://arb1.arbitrum.io/rpc
// MNEMONIC_arbitrum=your arbitrum mnemonic

// Results in:
// networks: {
//   arbitrum: {
//     type: 'http',
//     url: 'https://arb1.arbitrum.io/rpc',
//     accounts: { mnemonic: 'your arbitrum mnemonic' },
//     chainId: 42161,
//     chainType: 'op', // Automatically detected for OP-stack chains
//   }
// }
```

### Template Replacement

You can use template replacement in RPC URLs:

```bash
# Single RPC URL for multiple networks
ETH_NODE_URI=https://{{networkName}}.infura.io/v3/YOUR-PROJECT-ID

# This works for networks like:
# - mainnet.infura.io
# - sepolia.infura.io
# - polygon-mainnet.infura.io
```

## Benefits of Using Helpers

### 1. **Reduced Configuration**
- No need to manually configure each network
- Automatic chain ID and RPC URL management
- Built-in support for major networks

### 2. **Environment-Based Configuration**
- Easy switching between development and production
- Network-specific account management
- Secure secret handling

### 3. **Fork Testing Support**
- Automatic fork configuration
- Easy network switching for testing
- Proper account inheritance

### 4. **Maintainability**
- Single source of truth for network configurations
- Automatic updates when new networks are added
- Consistent naming conventions

## Common Patterns

### Multi-Environment Setup

```bash
# Development
ETH_NODE_URI_sepolia=https://sepolia.infura.io/v3/DEV-PROJECT-ID
MNEMONIC_sepolia=test test test test test test test test test test test junk

# Staging
ETH_NODE_URI_sepolia=https://sepolia.infura.io/v3/STAGING-PROJECT-ID
MNEMONIC_sepolia=your staging mnemonic

# Production
ETH_NODE_URI_ethereum=SECRET
MNEMONIC_ethereum=SECRET
```

### Fork Testing Workflow

```bash
# Test against mainnet fork
HARDHAT_FORK=ethereum npm run test

# Test against polygon fork at specific block
HARDHAT_FORK=polygon HARDHAT_FORK_NUMBER=50000000 npm run test

# Deploy to fork for testing
HARDHAT_FORK=ethereum npm run deploy
```

### CI/CD Integration

```yaml
# .github/workflows/test.yml
- name: Test on multiple networks
  run: |
    HARDHAT_FORK=ethereum npm run test
    HARDHAT_FORK=polygon npm run test
    HARDHAT_FORK=arbitrum npm run test
  env:
    ETH_NODE_URI_ethereum: ${{ secrets.MAINNET_RPC_URL }}
    ETH_NODE_URI_polygon: ${{ secrets.POLYGON_RPC_URL }}
    ETH_NODE_URI_arbitrum: ${{ secrets.ARBITRUM_RPC_URL }}
```

## Troubleshooting

### Network Not Found

If a network isn't automatically configured:

```bash
# Add explicit environment variable
ETH_NODE_URI_custom_network=https://rpc.custom-network.com
MNEMONIC_custom_network=your mnemonic here
```

### RPC URL Issues

```bash
# Check if environment variable is set
echo $ETH_NODE_URI_sepolia

# Verify template replacement
ETH_NODE_URI=https://{{networkName}}.example.com/rpc
# Should work for: sepolia.example.com, polygon.example.com, etc.
```

### Fork Configuration Problems

```bash
# Ensure target network is configured
ETH_NODE_URI_ethereum=https://mainnet.infura.io/v3/YOUR-PROJECT-ID

# Then fork will work
HARDHAT_FORK=ethereum
```

## Next Steps

- [Use Fork Testing](./use-fork-testing.md) to leverage the automatic fork configuration
- [Configure Named Accounts](./configure-named-accounts.md) for account management