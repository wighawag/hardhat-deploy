# Advanced Topics: hardhat-deploy v2

### Fork Testing

```typescript
import { addForkConfiguration } from "hardhat-deploy/helpers";
networks: addForkConfiguration({
  hardhat: { type: "edr-simulated", chainType: "l1" },
})
```

```bash
HARDHAT_FORK=mainnet npx hardhat test
HARDHAT_FORK=mainnet HARDHAT_FORK_NUMBER=12345678 npx hardhat test
```

### Environment Variable Configuration

`addNetworksFromEnv()` reads these automatically:

```bash
ETH_NODE_URI_MAINNET=https://mainnet.infura.io/v3/KEY
ETH_NODE_URI_SEPOLIA=https://sepolia.infura.io/v3/KEY
MNEMONIC="your twelve word mnemonic"
MNEMONIC_MAINNET="production mnemonic"   # network-specific override
```

Setting a value to `"SECRET"` uses `configVariable()` for secure handling.

### Custom Rocketh Extensions

```typescript
// rocketh/config.ts
import * as customExtension from "./my-custom-extension";
const extensions = { ...deployExtension, ...readExecuteExtension, ...customExtension };
```

### CI/CD Integration (GitHub Actions)

```yaml
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
        with: { node-version: "22", cache: "pnpm" }
      - run: pnpm install
      - run: pnpm compile --build-profile production
      - run: pnpm deploy sepolia
        env:
          ETH_NODE_URI_SEPOLIA: ${{ secrets.SEPOLIA_RPC_URL }}
          MNEMONIC_SEPOLIA: ${{ secrets.SEPOLIA_MNEMONIC }}
      - run: pnpm verify sepolia
        env:
          ETHERSCAN_API_KEY: ${{ secrets.ETHERSCAN_API_KEY }}
```

### Multi-Contract Deployments

```typescript
export default deployScript(async ({ deploy, namedAccounts }) => {
  const { deployer } = namedAccounts;
  const A = await deploy("ContractA", { account: deployer, artifact: artifacts.ContractA, args: [] });
  await deploy("ContractB", { account: deployer, artifact: artifacts.ContractB, args: [A.address] });
}, { tags: ["multi"] });
```

### Verification & Export

```bash
pnpm verify sepolia                                    # verify all
pnpm rocketh-verify -e sepolia --contract MyContract   # verify one
pnpm export sepolia                                    # export deployments JSON
```

### Hot Contract Replacement (HCR)

Use `deployViaProxy` with `proxyDisabled: false` in dev, then watch for changes:

```bash
pnpm deploy:watch sepolia
```

### TypeScript Type Safety

```typescript
import { Abi_MyContract } from "../generated/abis/MyContract.js";
const MyContract = env.get<Abi_MyContract>("MyContract");

await env.execute(MyContract, {
  account: deployer,
  functionName: "setValue",  // autocompleted by TypeScript
  args: [42n],               // type-checked
});

const value = await env.read(MyContract, { functionName: "getValue", args: [] });
```

### Existing v1 Deployments

v2 can read existing `deployments/` directory and `.chain` files directly. To refresh metadata:

```bash
pnpm compile && pnpm hardhat deploy --network <network> --reset
```
