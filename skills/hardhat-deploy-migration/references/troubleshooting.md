# Troubleshooting: hardhat-deploy v1 to v2 Migration

### "namedAccounts is not supported"

Remove `namedAccounts` from `hardhat.config.ts` and move to `rocketh/config.ts` under `accounts`:

```typescript
// rocketh/config.ts
export const config = {
  accounts: {
    deployer: { default: 0 },
    admin: { default: 1 },
  },
} as const satisfies UserConfig;
```

### "deployments.deploy is not a function"

In v2, `deploy` is on the environment directly:

```typescript
import { deployScript, artifacts } from "../rocketh/deploy.js";
export default deployScript(async ({ deploy }) => {
  await deploy("Contract", { artifact: artifacts.Contract, account: deployer, args: [] });
}, {});
```

### "from is not a valid parameter"

Change all `from:` to `account:` in deploy calls.

### Import errors with .js extensions

ESM requires explicit `.js` extensions for local imports:

```typescript
// Before
import { deployScript } from "../rocketh/deploy";
// After
import { deployScript } from "../rocketh/deploy.js";
```

### Type errors with artifacts

Import ABI types from generated artifacts:

```typescript
import { Abi_MyContract } from "../generated/abis/MyContract.js";
const MyContract = env.get<Abi_MyContract>("MyContract");
```

### "HardhatDeploy is not a constructor"

Use default import: `import HardhatDeploy from "hardhat-deploy";`

### Test fixtures not working

Replace `deployments.createFixture()` with custom fixture using `loadAndExecuteDeploymentsFromFiles()`:

```typescript
import { loadAndExecuteDeploymentsFromFiles } from "../rocketh/environment.js";
import { network } from "hardhat";

const { provider, networkHelpers } = await network.connect();
function setupFixtures(provider) {
  return {
    async deployAll() {
      const env = await loadAndExecuteDeploymentsFromFiles({ provider });
      return { env, MyContract: env.get<Abi_MyContract>("MyContract") };
    },
  };
}
const { deployAll } = setupFixtures(provider);
// In test: await networkHelpers.loadFixture(deployAll);
```

### "env.execute is not a function"

Ensure `@rocketh/read-execute` is imported in `rocketh/config.ts`:

```typescript
import * as readExecuteExtension from "@rocketh/read-execute";
const extensions = { ...deployExtension, ...readExecuteExtension };
```

### Network configuration not working

Use helper functions from `hardhat-deploy/helpers`:

```typescript
import { addForkConfiguration, addNetworksFromEnv, addNetworksFromKnownList } from "hardhat-deploy/helpers";
networks: addForkConfiguration(addNetworksFromKnownList(addNetworksFromEnv({ ... })))
```

### Solidity config not working

Convert `solidity.compilers` array to `solidity.profiles` object:

```typescript
solidity: {
  profiles: {
    default: { version: "0.8.17" },
    production: { version: "0.8.17", settings: { optimizer: { enabled: true, runs: 999999 } } },
  },
}
```

### Module not found for utils/network.ts

Delete `utils/network.ts` and use `addNetworksFromEnv()`/`addNetworksFromKnownList()` from `hardhat-deploy/helpers`.

### Proxied.sol import not found

Update Solidity import path (note underscore in `solc_0_8`):

```solidity
// Before
import "hardhat-deploy/solc_0.8/proxy/Proxied.sol";
// After
import "@rocketh/proxy/solc_0_8/ERC1967/Proxied.sol";
```
