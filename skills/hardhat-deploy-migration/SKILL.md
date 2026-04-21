---
name: hardhat-deploy-migration
description: >-
  Migrate projects from hardhat-deploy v1 to v2 — dependency updates,
  configuration restructuring, deploy script conversion, test updates, and
  troubleshooting. Use when the user asks about upgrading or migrating
  hardhat-deploy from v1 to v2, converting deploy scripts, fixing
  hardhat-deploy breaking changes, or encountering errors after updating
  hardhat-deploy. Trigger terms: "upgrade hardhat-deploy", "hardhat deploy
  plugin migration", "hardhat-deploy v2", "convert deploy scripts",
  "hardhat-deploy breaking changes", "solidity deployment migration",
  "rocketh migration", "hardhat 3 deploy".
---

# Migrate hardhat-deploy v1 to v2

> Reference: [template-ethereum-contracts](https://github.com/wighawag/template-ethereum-contracts) for a complete working v2 setup.

## Quick API Reference

| v1 Pattern | v2 Pattern |
|---|---|
| `require()`/`module.exports` | `import`/`export` (ESM) |
| `namedAccounts` in hardhat.config.ts | `accounts` in `rocketh/config.ts` |
| `hre.deployments.deploy(name, {from, ...})` | `env.deploy(name, {account, artifact, ...})` |
| `from: address` | `account: address` |
| `solidity: {compilers: [...]}` | `solidity: {profiles: {default: {...}}}` |
| `deployments.createFixture()` | `loadAndExecuteDeploymentsFromFiles()` |
| `ethers.getContract(name)` | `env.get<Abi_Type>(name)` |
| `contract.method()` | `env.execute(contract, {functionName, args})` |
| `hre.network.live` | `env.tags.live` |
| `proxy: useProxy && 'postUpgrade'` | `env.deployViaProxy(name, opts, {proxyDisabled, execute})` |
| `import 'hardhat-deploy'` | `import HardhatDeploy from 'hardhat-deploy'` (+ plugins array) |
| `func.tags = [...]` | `deployScript(fn, {tags: [...]})` |
| `import "hardhat-deploy/solc_0.8/proxy/Proxied.sol"` | `import "@rocketh/proxy/solc_0_8/ERC1967/Proxied.sol"` |

## Step 1: Update Dependencies

Add `"type": "module"` to package.json. Update/add these dependencies:

```json
{
  "type": "module",
  "devDependencies": {
    "hardhat": "^3.1.4",
    "hardhat-deploy": "^2.0.0",
    "rocketh": "^0.17.15",
    "@rocketh/deploy": "^0.17.9",
    "@rocketh/read-execute": "^0.17.9",
    "@rocketh/node": "^0.17.18",
    "@rocketh/signer": "^0.17.9",
    "@rocketh/proxy": "^0.17.13",
    "viem": "^2.45.0",
    "earl": "^2.0.0",
    "@nomicfoundation/hardhat-viem": "^3.0.1",
    "@nomicfoundation/hardhat-node-test-runner": "^3.0.8",
    "@nomicfoundation/hardhat-network-helpers": "^3.0.3",
    "@nomicfoundation/hardhat-keystore": "^3.0.3"
  }
}
```

Remove: `hardhat-deploy-ethers`, `hardhat-deploy-tenderly`, `ethers`. Optional: `@rocketh/export`, `@rocketh/verifier`, `@rocketh/doc`.

Update `tsconfig.json`: set `module: "node16"`, `target: "es2022"`, `moduleResolution: "node16"`, `lib: ["es2023"]`. Create `test/tsconfig.json` and `scripts/tsconfig.json` extending the root config with `noEmit: true`.

## Step 2: Restructure Configuration

### 2.1 Convert hardhat.config.ts

```typescript
import type { HardhatUserConfig } from "hardhat/config";
import HardhatNodeTestRunner from "@nomicfoundation/hardhat-node-test-runner";
import HardhatViem from "@nomicfoundation/hardhat-viem";
import HardhatNetworkHelpers from "@nomicfoundation/hardhat-network-helpers";
import HardhatKeystore from "@nomicfoundation/hardhat-keystore";
import HardhatDeploy from "hardhat-deploy";
import {
  addForkConfiguration, addNetworksFromEnv, addNetworksFromKnownList,
} from "hardhat-deploy/helpers";

const config: HardhatUserConfig = {
  plugins: [
    HardhatNodeTestRunner, HardhatViem, HardhatNetworkHelpers,
    HardhatKeystore, HardhatDeploy,
  ],
  solidity: {
    profiles: {
      default: { version: "0.8.17" },
      production: {
        version: "0.8.17",
        settings: { optimizer: { enabled: true, runs: 999999 } },
      },
    },
  },
  networks: addForkConfiguration(
    addNetworksFromKnownList(
      addNetworksFromEnv({
        default: {
          type: "edr-simulated",
          chainType: "l1",
          accounts: { mnemonic: process.env.MNEMONIC || undefined },
        },
      }),
    ),
  ),
  paths: { sources: ["src"] },
  generateTypedArtifacts: {
    destinations: [{ folder: "./generated", mode: "typescript" }],
  },
};
export default config;
```

Key changes: remove `namedAccounts`, convert `solidity.compilers` to `solidity.profiles`, add `plugins` array, use helper functions for networks, add `generateTypedArtifacts`, delete `utils/network.ts`.

### 2.2 Create rocketh/config.ts

```typescript
import type { EnhancedEnvironment, UnknownDeployments, UserConfig } from "rocketh/types";
import { privateKey } from "@rocketh/signer";

export const config = {
  accounts: {
    deployer: { default: 0 },
    simpleERC20Beneficiary: { default: 1 },
  },
  data: {},
  signerProtocols: { privateKey },
} as const satisfies UserConfig;

import * as deployExtension from "@rocketh/deploy";
import * as readExecuteExtension from "@rocketh/read-execute";
import * as deployProxyExtension from "@rocketh/proxy";
import * as viemExtension from "@rocketh/viem";

const extensions = {
  ...deployExtension, ...readExecuteExtension,
  ...deployProxyExtension, ...viemExtension,
};
export { extensions };

type Extensions = typeof extensions;
type Accounts = typeof config.accounts;
type Data = typeof config.data;
type Environment = EnhancedEnvironment<Accounts, Data, UnknownDeployments, Extensions>;
export type { Extensions, Accounts, Data, Environment };
```

### 2.3 Create rocketh/deploy.ts

```typescript
import { type Accounts, type Data, type Extensions, extensions } from "./config.js";
import * as artifacts from "../generated/artifacts/index.js";
export { artifacts };
import { setupDeployScripts } from "rocketh";
const { deployScript } = setupDeployScripts<Extensions, Accounts, Data>(extensions);
export { deployScript };
```

### 2.4 Create rocketh/environment.ts

```typescript
import { type Accounts, type Data, type Extensions, extensions } from "./config.js";
import { setupEnvironmentFromFiles } from "@rocketh/node";
import { setupHardhatDeploy } from "hardhat-deploy/helpers";

const { loadAndExecuteDeploymentsFromFiles } = setupEnvironmentFromFiles<
  Extensions, Accounts, Data
>(extensions);
const { loadEnvironmentFromHardhat } = setupHardhatDeploy<
  Extensions, Accounts, Data
>(extensions);

export { loadEnvironmentFromHardhat, loadAndExecuteDeploymentsFromFiles };
```

## Step 3: Convert Deploy Scripts

### Simple Deployment

**v1:**
```typescript
const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deploy } = hre.deployments;
  const { deployer } = await hre.getNamedAccounts();
  await deploy("SimpleERC20", {
    from: deployer, args: [beneficiary, parseEther("1000000000")], log: true,
  });
};
export default func;
func.tags = ["SimpleERC20"];
```

**v2:**
```typescript
import { deployScript, artifacts } from "../rocketh/deploy.js";
import { parseEther } from "viem";

export default deployScript(async (env) => {
  const { deployer, simpleERC20Beneficiary } = env.namedAccounts;
  await env.deploy("SimpleERC20", {
    artifact: artifacts.SimpleERC20,
    account: deployer,
    args: [simpleERC20Beneficiary, parseEther("1000000000")],
  });
}, { tags: ["SimpleERC20"] });
```

### Proxy Deployment

**v1:**
```typescript
const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const useProxy = !hre.network.live;
  await hre.deployments.deploy("GreetingsRegistry", {
    from: deployer, proxy: useProxy && "postUpgrade", args: [2], log: true,
  });
  return !useProxy;
};
func.id = "deploy_greetings_registry";
func.tags = ["GreetingsRegistry"];
```

**v2:**
```typescript
import { deployScript, artifacts } from "../rocketh/deploy.js";

export default deployScript(async (env) => {
  const { deployer } = env.namedAccounts;
  const useProxy = !env.tags.live;
  await env.deployViaProxy("GreetingsRegistry", {
    account: deployer, artifact: artifacts.GreetingsRegistry, args: ["2"],
  }, {
    proxyDisabled: !useProxy, execute: "postUpgrade",
  });
  return !useProxy;
}, { tags: ["GreetingsRegistry"], id: "deploy_greetings_registry" });
```

## Step 4: Convert Tests

**v1:**
```typescript
import { expect } from "chai";
import { ethers, deployments, getNamedAccounts, getUnnamedAccounts } from "hardhat";

const setup = deployments.createFixture(async () => {
  await deployments.fixture("SimpleERC20");
  const contracts = { SimpleERC20: await ethers.getContract<IERC20>("SimpleERC20") };
  return { ...contracts, users: await setupUsers(await getUnnamedAccounts(), contracts) };
});
```

**v2:**
```typescript
import { expect } from "earl";
import { describe, it } from "node:test";
import { network } from "hardhat";
import { EthereumProvider } from "hardhat/types/providers";
import { loadAndExecuteDeploymentsFromFiles } from "../rocketh/environment.js";
import { Abi_SimpleERC20 } from "../generated/abis/SimpleERC20.js";

function setupFixtures(provider: EthereumProvider) {
  return {
    async deployAll() {
      const env = await loadAndExecuteDeploymentsFromFiles({ provider });
      const SimpleERC20 = env.get<Abi_SimpleERC20>("SimpleERC20");
      return { env, SimpleERC20, namedAccounts: env.namedAccounts, unnamedAccounts: env.unnamedAccounts };
    },
  };
}

const { provider, networkHelpers } = await network.connect();
const { deployAll } = setupFixtures(provider);

describe("SimpleERC20", function () {
  it("transfer fails", async function () {
    const { env, SimpleERC20, unnamedAccounts } = await networkHelpers.loadFixture(deployAll);
    await expect(
      env.execute(SimpleERC20, { account: unnamedAccounts[0], functionName: "transfer", args: [unnamedAccounts[1], 1n] }),
    ).toBeRejectedWith("NOT_ENOUGH_TOKENS");
  });
});
```

Key test changes: `mocha` to `node:test`, `chai` to `earl`, `deployments.createFixture()` to custom fixture with `loadAndExecuteDeploymentsFromFiles()`, `ethers.getContract()` to `env.get<Abi_Type>()`, contract calls to `env.execute()`, use `BigInt` literals (`1n`), use `networkHelpers.loadFixture()`.

## Step 5: Update Scripts

```typescript
import hre from "hardhat";
import { loadEnvironmentFromHardhat } from "./rocketh/environment.js";
import { Abi_MyContract } from "./generated/abis/MyContract.js";

async function main() {
  const env = await loadEnvironmentFromHardhat({ hre });
  const MyContract = env.get<Abi_MyContract>("MyContract");
  await env.execute(MyContract, {
    account: env.namedAccounts.deployer, functionName: "someFunction", args: [],
  });
}
main().catch((e) => { console.error(e); process.exit(1); });
```

## Step 6: Update package.json Scripts

Key changes: remove `hardhat typechain`, use `hardhat test` (not mocha), use `hardhat compile --build-profile production` for production builds, use `rocketh-verify`, `rocketh-export`, `rocketh-doc` for verification/export/docs.

## Migration Checklist

- [ ] `"type": "module"` in package.json
- [ ] Hardhat 3.x, hardhat-deploy 2.x, rocketh packages installed
- [ ] `tsconfig.json` updated for ESM (`module: "node16"`)
- [ ] `hardhat.config.ts`: removed `namedAccounts`, added `plugins` array, converted `solidity.compilers` to `solidity.profiles`
- [ ] `rocketh/config.ts`: accounts + extensions
- [ ] `rocketh/deploy.ts`: deployScript + artifacts
- [ ] `rocketh/environment.ts`: loadEnvironmentFromHardhat + loadAndExecuteDeploymentsFromFiles
- [ ] Deploy scripts: `deployScript()` wrapper, `env.deploy()`, `account:` not `from:`, explicit `artifact:`
- [ ] Tests: `node:test` + `earl`, custom fixtures with `loadAndExecuteDeploymentsFromFiles()`, `env.get()`/`env.execute()`
- [ ] Scripts: `loadEnvironmentFromHardhat()`, `env.get()`/`env.execute()`
- [ ] Solidity imports: `hardhat-deploy/solc_0.8/proxy/Proxied.sol` to `@rocketh/proxy/solc_0_8/ERC1967/Proxied.sol`
- [ ] `utils/network.ts` deleted (use `hardhat-deploy/helpers` instead)
- [ ] Compilation, deployment, and tests pass

## Troubleshooting

See [references/troubleshooting.md](references/troubleshooting.md) for solutions to common migration errors including `namedAccounts is not supported`, `from is not a valid parameter`, import errors with `.js` extensions, and more.

## Advanced Topics

See [references/advanced.md](references/advanced.md) for fork testing, environment variable configuration, custom rocketh extensions, CI/CD integration, multi-contract deployments, verification, export, HCR, and TypeScript type safety.

## Resources

- [hardhat-deploy v2 docs](https://rocketh.dev/hardhat-deploy/)
- [Migration from v1 guide](https://rocketh.dev/hardhat-deploy/documentation/how-to/migration-from-v1.md)
- [template-ethereum-contracts](https://github.com/wighawag/template-ethereum-contracts) (complete working example)
- [Rocketh](https://github.com/wighawag/rocketh)
