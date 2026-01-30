
# Configuration

Configuration of hardhat's network or other hardhat specific config is done via hardhat.config.ts

The `rocketh/config.ts` file is where you configure hardhat-deploy/rocketh specific configs.

### **1. namedAccounts (ability to name addresses)**

The `rocketh/config.ts` file needs to export a config object.

For example:

```js
import type {UserConfig} from 'rocketh/types';
export const config = {
	accounts: {
		deployer: {
			default: 0,
      sepolia: 1
		},
		admin: {
			default: 1,
		},
	},
} as const satisfies UserConfig;

import * as artifacts from './generated/artifacts.js';
export {artifacts};
```

This config file imports modules too so that deploy scripts can simply import `rocketh/config.ts` to have access to artifacts and specific functions.

The named account feature allows you to define accounts by name and have them configurable by environment.

In the above file, the deployer is set to be the first account on all environments, except for sepolia where it is the second.

### **2. deterministicDeployment (ability to specify a deployment factory)**

---

The config also allow you to set an optional `deterministicDeployment` field.

`deterministicDeployment` allows you to associate information that are used on each chain for deterministic deployment. The information for each deterministic deployment consist out of a `factory`, a `deployer`, the required `funding` and a `signedTx` to deploy the factory. The default deterministic deployment used is the [Deterministic Deployment Proxy](https://github.com/Arachnid/deterministic-deployment-proxy). The factory expects a 32 bytes `salt` concatenated with the deployment data (see [EIP-1014](https://eips.ethereum.org/EIPS/eip-1014) for more information on these parameters).

Using the `deterministicDeployment` it is possible to define a different setup for the deterministic deployment. One use case for this is the deterministic deployment on networks that required replay protection (such as Celo or Avalanche). The [Deterministic Deployment Proxy](https://github.com/Arachnid/deterministic-deployment-proxy) can only be deployed on networks that don't enforce replay protection, therefore on other networks an alternative library has to be used. An example for this would be the [Safe Singleton Factory](https://github.com/gnosis/safe-singleton-factory) that is an adjusted version of the [Deterministic Deployment Proxy](https://github.com/Arachnid/deterministic-deployment-proxy) that contains signed transactions that include replay protection.

```js
import type {UserConfig} from 'rocketh/types';
export const config = {
	accounts: {
		deployer: {
			default: 0,
      sepolia: 1
		},
		admin: {
			default: 1,
		},
	},
  chains: {
    sepolia: {
        factory: '0x4e59b44847b379578588920ca78fbf26c0b4956c',
        deployer: '0x3fab184622dc19b6109349b94811493bf2a45362',
        funding: '10000000000000000',
        signedTx:
          '0xf8a58085174876e800830186a08080b853604580600e600039806000f350fe7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe03601600081602082378035828234f58015156039578182fd5b8082525050506014600cf31ba02222222222222222222222222222222222222222222222222222222222222222a02222222222222222222222222222222222222222222222222222222222222222',
      }
  }
} as const satisfies UserConfig;
```