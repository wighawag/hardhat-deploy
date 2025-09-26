# How to Use Tags and Dependencies

Tags and dependencies are powerful features that help you organize and control the execution order of your deploy scripts. This guide shows you how to use them effectively.

## What are Tags?

Tags are labels you assign to deploy scripts that allow you to:
- Run specific groups of deployments
- Control execution order through dependencies
- Organize deployments by feature or component

## What are Dependencies?

Dependencies specify which tags must be executed before the current script runs, ensuring proper deployment order.

## Basic Tag Usage

### Simple Tags

Add tags to your deploy scripts:

```typescript
import { deployScript, artifacts } from "#rocketh";

export default deployScript(
  async ({ deploy, namedAccounts }) => {
    const { deployer } = namedAccounts;

    await deploy("MyToken", {
      account: deployer,
      artifact: artifacts.MyToken,
      args: ["My Token", "MTK"],
    });
  },
  { tags: ["MyToken", "tokens"] } // Multiple tags
);
```

### Running Specific Tags

Deploy only scripts with specific tags:

```bash
# Deploy only token-related contracts
npx hardhat deploy --tags tokens

# Deploy multiple tag groups
npx hardhat deploy --tags tokens,governance

# Deploy everything (default behavior)
npx hardhat deploy
```

## Using Dependencies

### Basic Dependencies

Ensure scripts run in the correct order:

```typescript
// deploy/001_deploy_token.ts
export default deployScript(
  async ({ deploy, namedAccounts }) => {
    // Deploy token first
    await deploy("MyToken", { /* ... */ });
  },
  { tags: ["MyToken", "tokens"] }
);

// deploy/002_deploy_governance.ts
export default deployScript(
  async ({ deploy, namedAccounts }) => {
    // This runs after token deployment
    await deploy("Governance", { /* ... */ });
  },
  { 
    tags: ["Governance", "governance"],
    dependencies: ["MyToken"] // Wait for MyToken tag to complete
  }
);
```

### Complex Dependencies

Handle multiple dependencies:

```typescript
// deploy/003_deploy_staking.ts
export default deployScript(
  async ({ deploy, namedAccounts }) => {
    await deploy("Staking", { /* ... */ });
  },
  { 
    tags: ["Staking"],
    dependencies: ["MyToken", "Governance"] // Wait for both
  }
);
```

## Practical Examples

### DeFi Protocol Deployment

```typescript
// deploy/001_deploy_token.ts
export default deployScript(
  async ({ deploy, namedAccounts }) => {
    const { deployer } = namedAccounts;
    
    await deploy("ProtocolToken", {
      account: deployer,
      artifact: artifacts.ProtocolToken,
      args: ["Protocol Token", "PROTO"],
    });
  },
  { tags: ["ProtocolToken", "tokens", "core"] }
);

// deploy/002_deploy_treasury.ts
export default deployScript(
  async ({ deploy, namedAccounts }) => {
    const { deployer, treasury } = namedAccounts;
    
    await deploy("Treasury", {
      account: deployer,
      artifact: artifacts.Treasury,
      args: [treasury],
    });
  },
  { tags: ["Treasury", "core"] }
);

// deploy/003_deploy_staking.ts
export default deployScript(
  async ({ deploy, namedAccounts, get }) => {
    const { deployer } = namedAccounts;
    const token = get("ProtocolToken");
    const treasury = get("Treasury");
    
    await deploy("Staking", {
      account: deployer,
      artifact: artifacts.Staking,
      args: [token.address, treasury.address],
    });
  },
  { 
    tags: ["Staking", "defi"],
    dependencies: ["ProtocolToken", "Treasury"]
  }
);

// deploy/004_deploy_governance.ts
export default deployScript(
  async ({ deploy, namedAccounts, get }) => {
    const { deployer } = namedAccounts;
    const token = get("ProtocolToken");
    
    await deploy("Governance", {
      account: deployer,
      artifact: artifacts.Governance,
      args: [token.address],
    });
  },
  { 
    tags: ["Governance", "dao"],
    dependencies: ["ProtocolToken"]
  }
);
```

### Deployment Commands

```bash
# Deploy core infrastructure only
npx hardhat deploy --tags core

# Deploy DeFi components (requires core)
npx hardhat deploy --tags defi

# Deploy governance (requires tokens)
npx hardhat deploy --tags dao

# Deploy everything
npx hardhat deploy
```

### NFT Project with Marketplace

```typescript
// deploy/001_deploy_nft.ts
export default deployScript(
  async ({ deploy, namedAccounts }) => {
    await deploy("MyNFT", { /* ... */ });
  },
  { tags: ["MyNFT", "nft", "core"] }
);

// deploy/002_deploy_marketplace.ts
export default deployScript(
  async ({ deploy, namedAccounts, get }) => {
    const nft = get("MyNFT");
    
    await deploy("Marketplace", {
      // ...
      args: [nft.address],
    });
  },
  { 
    tags: ["Marketplace", "trading"],
    dependencies: ["MyNFT"]
  }
);

// deploy/003_deploy_auction.ts
export default deployScript(
  async ({ deploy, namedAccounts, get }) => {
    const nft = get("MyNFT");
    const marketplace = get("Marketplace");
    
    await deploy("Auction", {
      // ...
      args: [nft.address, marketplace.address],
    });
  },
  { 
    tags: ["Auction", "trading"],
    dependencies: ["MyNFT", "Marketplace"]
  }
);
```

## Troubleshooting

### Circular Dependencies

If you get circular dependency errors:

1. Review your dependency chain
2. Break circular references by removing unnecessary dependencies
3. Use conditional logic instead of dependencies where appropriate

### Missing Dependencies

If deployments fail due to missing contracts:

1. Check that dependency tags are correctly spelled
2. Ensure dependency scripts exist and have the right tags
3. Verify the dependency scripts don't have errors

### Wrong Execution Order

If scripts run in the wrong order:

1. Add explicit dependencies to control order
2. Use numbered prefixes (001_, 002_) as a backup
3. Check that all required dependencies are listed

## Next Steps

- [Deploy with Proxies](./deploy-with-proxies.md) for upgradeable contracts
- [Deployment Fixtures in Tests](./deployment-fixtures-in-tests.md) for testing integration
