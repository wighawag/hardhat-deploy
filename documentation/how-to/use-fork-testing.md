# How to Use Fork Testing

Fork testing allows you to test your deployments against real blockchain state by forking mainnet or other networks. This guide shows you how to use fork testing with hardhat-deploy, building on the network configuration from the [Configure Network Helpers](./configure-network-helpers.md) guide.

## Prerequisites

Before using fork testing, ensure you have:

1. **Network helpers configured** - Follow the [Configure Network Helpers](./configure-network-helpers.md) guide to set up `addForkConfiguration` in your `hardhat.config.ts`
2. **Network environment variables** - Set up `ETH_NODE_URI_<network>` for the networks you want to fork

## What is Fork Testing?

Fork testing creates a local copy of a blockchain at a specific block, allowing you to:
- Test deployments against real contract state
- Interact with existing contracts and protocols
- Validate integrations with live systems
- Debug issues in a controlled environment

## How Fork Testing Works

The `addForkConfiguration` helper from your network configuration automatically sets up fork testing when you use the `HARDHAT_FORK` environment variable:

```bash
# Fork Ethereum mainnet (uses ETH_NODE_URI_ethereum)
HARDHAT_FORK=ethereum npx hardhat deploy

# Fork at specific block
HARDHAT_FORK=ethereum HARDHAT_FORK_NUMBER=18500000 npx hardhat deploy

# Fork other networks (uses their respective ETH_NODE_URI_<network>)
HARDHAT_FORK=polygon npx hardhat deploy
HARDHAT_FORK=arbitrum npx hardhat deploy
```

The network helpers automatically:
- Use the target network's RPC URL from `ETH_NODE_URI_<network>`
- Copy account configuration from the target network
- Set up the `fork` network configuration
- Handle block number specification with `HARDHAT_FORK_NUMBER`

## Fork Testing Patterns

### Testing Against Live Protocols

```typescript
import { deployScript, artifacts } from "../rocketh/deploy.js";

export default deployScript(
  async (env) => {
    const { deployer } = env.namedAccounts;
    const { name: networkName } = env.network;
    
    console.log(`Deploying on ${networkName} (fork: ${env.network.fork || 'none'})`);
    
    // Deploy your contract
    const deployment = await env.deploy("MyDeFiContract", {
      account: deployer,
      artifact: artifacts.MyDeFiContract,
      args: [
        "0xA0b86a33E6441E8C8C7014b5C1e8e8b8C8C8C8C8", // USDC on mainnet
        "0x7d2768dE32b0b80b7a3454c06BdAc94A69DDc7A9", // Aave LendingPool
      ],
    });
    
    if (env.network.fork) {
      // Only run integration tests when forking
      console.log("Running fork-specific validation...");
      
      // Test interaction with live USDC contract
      const usdcAddress = "0xA0b86a33E6441E8C8C7014b5C1e8e8b8C8C8C8C8";
      const usdcBalance = await env.read({
        address: usdcAddress,
        abi: [{"constant":true,"inputs":[{"name":"_owner","type":"address"}],"name":"balanceOf","outputs":[{"name":"balance","type":"uint256"}],"type":"function"}],
      }, {
        functionName: "balanceOf",
        args: [deployment.address],
      });
      
      console.log(`Contract USDC balance: ${usdcBalance}`);
    }
  },
  { tags: ["MyDeFiContract"] }
);
```

## Integration with Development Workflows

### Development Scripts

The template shows how to integrate fork testing into development workflows. Here are the core patterns (external tools like `ldenv` are optional suggestions):

```bash
# Basic fork deployment (using built-in HARDHAT_FORK)
HARDHAT_FORK=mainnet npx hardhat deploy

# Optional: Using environment management tools (suggestion)
# Install ldenv: npm install -D ldenv
ldenv -n HARDHAT_FORK=mainnet hardhat deploy
```

### Package.json Scripts

```json
{
  "scripts": {
    "fork:mainnet": "HARDHAT_FORK=mainnet hardhat deploy",
    "fork:polygon": "HARDHAT_FORK=polygon hardhat deploy",
    "fork:test": "HARDHAT_FORK=mainnet hardhat test",
    "fork:execute": "HARDHAT_FORK=mainnet hardhat run scripts/interact.ts"
  }
}
```


## Next Steps

- [Verify Contracts](./verify-contracts.md) for contract verification after fork testing
- [Use Viem Integration](./use-viem-integration.md) for type-safe fork interactions
