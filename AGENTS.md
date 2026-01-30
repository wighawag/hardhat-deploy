# AGENTS.md - hardhat-deploy

This document provides guidance for AI agents working with the hardhat-deploy codebase.

## Project Overview

**hardhat-deploy** is a Hardhat plugin for replicable smart contract deployments and easy testing across multiple EVM chains. Version 2 is a complete rewrite that integrates with [rocketh](https://github.com/wighawag/rocketh), a framework-agnostic deployment system.

### Key Features

- **Named Accounts**: Associate names with addresses for clearer scripts
- **Proxy Deployments**: Declarative proxy patterns including OpenZeppelin transparent proxies
- **Diamond Support**: Deploy EIP-2535 Diamonds declaratively
- **Hot Contract Replacement (HCR)**: Live contract updates during development
- **Browser-Compatible**: Deployment scripts can run in browsers
- **Type Safety**: Full TypeScript support with generated artifacts

## Repository Structure

```
hardhat-deploy/
├── packages/
│   └── hardhat-deploy/          # Main package source
│       ├── src/
│       │   ├── index.ts         # Plugin entry point
│       │   ├── cli.ts           # CLI for project initialization
│       │   ├── helpers.ts       # Network/config helper functions
│       │   ├── types.ts         # TypeScript type definitions
│       │   ├── config/          # Configuration handling
│       │   ├── hook-handlers/   # Hardhat hook handlers
│       │   └── tasks/           # Hardhat tasks (deploy)
│       └── templates/           # Project templates for `init`
├── demoes/
│   ├── basic/                   # Basic deployment example
│   ├── diamond/                 # EIP-2535 Diamond pattern example
│   └── proxies/                 # Proxy deployment patterns example
├── documentation/               # VitePress documentation
├── skills/
│   └── hardhat-deploy-migration/ # v1 to v2 migration guide
└── .vitepress/                  # Documentation site config
```

## Architecture

### Core Components

#### 1. Plugin Entry ([`packages/hardhat-deploy/src/index.ts`](packages/hardhat-deploy/src/index.ts:1))

The main Hardhat plugin that registers:
- Hook handlers for config and solidity compilation
- The `deploy` task
- Integration with rocketh environment

```typescript
const hardhatPlugin: HardhatPlugin = {
  id: 'hardhat-deploy',
  hookHandlers: {
    config: () => import('./hook-handlers/config.js'),
    solidity: () => import('./hook-handlers/solidity.js'),
  },
  tasks: [
    task('deploy', 'Deploy contracts')
      .addFlag({name: 'skipPrompts', description: 'if set, skip any prompts'})
      .addOption({name: 'saveDeployments', ...})
      .addOption({name: 'tags', ...})
      .setAction(() => import('./tasks/deploy.js'))
      .build(),
  ],
};
```

#### 2. Helper Functions ([`packages/hardhat-deploy/src/helpers.ts`](packages/hardhat-deploy/src/helpers.ts:1))

Provides utilities for:
- [`loadEnvironmentFromHardhat()`](packages/hardhat-deploy/src/helpers.ts:112) - Load rocketh environment from Hardhat
- [`setupHardhatDeploy()`](packages/hardhat-deploy/src/helpers.ts:15) - Setup with custom extensions
- [`addNetworksFromEnv()`](packages/hardhat-deploy/src/helpers.ts:205) - Auto-configure networks from env vars
- [`addNetworksFromKnownList()`](packages/hardhat-deploy/src/helpers.ts:231) - Add known chains
- [`addForkConfiguration()`](packages/hardhat-deploy/src/helpers.ts:259) - Configure fork testing
- [`getRPC()`](packages/hardhat-deploy/src/helpers.ts:150) / [`getMnemonic()`](packages/hardhat-deploy/src/helpers.ts:175) - Get network credentials

#### 3. Deploy Task ([`packages/hardhat-deploy/src/tasks/deploy.ts`](packages/hardhat-deploy/src/tasks/deploy.ts:1))

Executes deployment scripts using `loadAndExecuteDeploymentsFromFiles()` from `@rocketh/node`.

#### 4. CLI ([`packages/hardhat-deploy/src/cli.ts`](packages/hardhat-deploy/src/cli.ts:1))

Provides the `hardhat-deploy init` command to scaffold new projects from templates.

### Extension System (rocketh)

hardhat-deploy v2 uses rocketh's extension system. Extensions are imported and combined in the project's `rocketh/config.ts`:

| Extension | Purpose |
|-----------|---------|
| `@rocketh/deploy` | Basic `deploy()` function |
| `@rocketh/proxy` | `deployViaProxy()` for upgradeable contracts |
| `@rocketh/diamond` | `diamond()` for EIP-2535 Diamond deployments |
| `@rocketh/read-execute` | `read()`, `execute()`, `readByName()`, `executeByName()`, and `tx()` for contract interactions |
| `@rocketh/viem` | Viem client integration via `viem()` returning `getContract()`, `getWritableContract()`, `walletClient`, `publicClient` |
| `@rocketh/signer` | Signer protocols (e.g., `privateKey`) |
| `@rocketh/export` | Export deployments to JS/TS/JSON formats |
| `@rocketh/verifier` | Verify contracts on Etherscan, Sourcify, or Blockscout |

## Project Configuration Pattern

Every hardhat-deploy v2 project requires three configuration files in the `rocketh/` directory:

### 1. `rocketh/config.ts` - Named Accounts & Extensions

```typescript
import type {UserConfig} from 'rocketh/types';

export const config = {
  accounts: {
    deployer: { default: 0 },
    admin: { default: 1 },
  },
  data: {},
} as const satisfies UserConfig;

// Import and combine extensions
import * as deployExtension from '@rocketh/deploy';
import * as readExecuteExtension from '@rocketh/read-execute';

const extensions = {
  ...deployExtension,
  ...readExecuteExtension,
};
export {extensions};

// Export types
export type {Extensions, Accounts, Data};
```

### 2. `rocketh/deploy.ts` - Deploy Script Setup

```typescript
import {type Extensions, type Accounts, type Data, extensions} from './config.js';
import * as artifacts from '../generated/artifacts/index.js';
import {setupDeployScripts} from 'rocketh';

const {deployScript} = setupDeployScripts<Extensions, Accounts, Data>(extensions);
export {deployScript, artifacts};
```

### 3. `rocketh/environment.ts` - Test/Script Environment

```typescript
import {type Extensions, type Accounts, type Data, extensions} from './config.js';
import {setupEnvironmentFromFiles} from '@rocketh/node';
import {setupHardhatDeploy} from 'hardhat-deploy/helpers';

const {loadAndExecuteDeploymentsFromFiles} = setupEnvironmentFromFiles<Extensions, Accounts, Data>(extensions);
const {loadEnvironmentFromHardhat} = setupHardhatDeploy<Extensions, Accounts, Data>(extensions);

export {loadEnvironmentFromHardhat, loadAndExecuteDeploymentsFromFiles};
```

## Deploy Script Pattern

Deploy scripts use the `deployScript()` wrapper:

```typescript
import {deployScript, artifacts} from '../rocketh/deploy.js';

export default deployScript(
  async ({deploy, namedAccounts}) => {
    const {deployer} = namedAccounts;

    await deploy('MyContract', {
      account: deployer,           // Who deploys (was 'from:' in v1)
      artifact: artifacts.MyContract,  // Contract artifact
      args: ['arg1', 'arg2'],
    });
  },
  {tags: ['MyContract'], id: 'deploy_my_contract'},
);
```

## Test Pattern

Tests use `node:test` with the fixture pattern:

```typescript
import {expect} from 'earl';
import {describe, it} from 'node:test';
import {network} from 'hardhat';
import {loadAndExecuteDeploymentsFromFiles} from '../rocketh/environment.js';

function setupFixtures(provider) {
  return {
    async deployAll() {
      const env = await loadAndExecuteDeploymentsFromFiles({provider});
      const MyContract = env.get<Abi_MyContract>('MyContract');
      return {env, MyContract, namedAccounts: env.namedAccounts};
    },
  };
}

const {provider, networkHelpers} = await network.connect();
const {deployAll} = setupFixtures(provider);

describe('MyContract', () => {
  it('should work', async () => {
    const {env, MyContract} = await networkHelpers.loadFixture(deployAll);
    
    // Read from contract
    const value = await env.read(MyContract, {functionName: 'getValue', args: []});
    
    // Execute transaction
    await env.execute(MyContract, {
      account: env.namedAccounts.deployer,
      functionName: 'setValue',
      args: [42n],
    });
  });
});
```

## Key Differences from v1

| Aspect | v1 | v2 |
|--------|----|----|
| Module System | CommonJS | ESM (`"type": "module"`) |
| Hardhat Version | 2.x | 3.x |
| Named Accounts | `hardhat.config.ts` | `rocketh/config.ts` |
| Deploy Parameter | `from: address` | `account: address` |
| Artifact | Implicit | Explicit `artifact: artifacts.X` |
| Test Fixtures | `deployments.createFixture()` | Custom with `loadAndExecuteDeploymentsFromFiles()` |
| Contract Access | `ethers.getContract()` | `env.get<Abi_Type>()` |
| Execution | `contract.method()` | `env.execute(contract, {...})` |

## Common Tasks

### Adding a New Deploy Script

1. Create file in `deploy/` directory (e.g., `deploy/002_my_contract.ts`)
2. Import `deployScript` and `artifacts` from `../rocketh/deploy.js`
3. Use the `deployScript()` wrapper with tags

### Adding a New Extension

1. Install the extension package (e.g., `@rocketh/proxy`)
2. Import in `rocketh/config.ts`
3. Add to the `extensions` object
4. Update the `Extensions` type export

### Running Deployments

```bash
# Local deployment
npx hardhat deploy

# Specific network
npx hardhat --network sepolia deploy

# With specific tags
npx hardhat deploy --tags MyContract

# Production build + deploy
npx hardhat compile --build-profile production && npx hardhat --network mainnet deploy
```

### Fork Testing

```bash
# Set fork network via environment
HARDHAT_FORK=mainnet npx hardhat test

# With specific block
HARDHAT_FORK=mainnet HARDHAT_FORK_NUMBER=12345678 npx hardhat test
```

## Environment Variables

The helper functions read these environment variables:

| Variable | Purpose |
|----------|---------|
| `ETH_NODE_URI_<network>` | RPC URL for network (e.g., `ETH_NODE_URI_MAINNET`) |
| `MNEMONIC` | Default mnemonic for all networks |
| `MNEMONIC_<network>` | Network-specific mnemonic |
| `HARDHAT_FORK` | Network to fork from |
| `HARDHAT_FORK_NUMBER` | Block number to fork from |

Set to `SECRET` to use `configVariable()` for sensitive data.

## File Naming Conventions

- Deploy scripts: `deploy/NNN_description.ts` (numbered for order)
- Solidity sources: `src/ContractName/ContractName.sol`
- Generated artifacts: `generated/artifacts/` and `generated/abis/`
- Deployment records: `deployments/<network>/ContractName.json`

## Documentation

The project uses VitePress for documentation at [`documentation/`](documentation/). Key files:

- [`introduction.md`](documentation/introduction.md:1) - Project overview
- [`installation.md`](documentation/installation.md) - Setup guide
- [`configuration.md`](documentation/configuration.md:1) - Config options
- [`how-to/`](documentation/how-to/) - How-to guides

## Migration from v1

For v1 to v2 migration guidance, see [`skills/hardhat-deploy-migration/SKILL.md`](skills/hardhat-deploy-migration/SKILL.md:1). This comprehensive guide covers:

- Dependency updates
- Configuration restructuring
- Deploy script conversion
- Test updates
- Common troubleshooting

## Development Commands

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build

# Run tests
pnpm test

# Start documentation dev server
pnpm docs:dev

# Watch mode for package development
pnpm dev
```

## Code Style

- TypeScript with strict mode
- ESM modules (`.js` extensions required in imports)
- Prettier for formatting
- Use `as const satisfies` for typed configs
- Explicit artifact imports in deploy scripts

## Important Notes for AI Agents

1. **Always use `.js` extensions** for local imports in ESM
2. **Named accounts** are configured in `rocketh/config.ts`, not `hardhat.config.ts`
3. **Use `account:` not `from:`** for deployer specification
4. **Artifacts must be explicitly imported** and passed to deploy functions
5. **Tests use `node:test`** not mocha/vitest
6. **Use BigInt literals** (`1n`) for numeric values in contract calls
7. **Check the demos** for working examples of patterns
8. **The `generated/` directory** is created by compilation - don't edit manually