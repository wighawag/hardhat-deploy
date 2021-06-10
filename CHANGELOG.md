# hardhat-deploy

## 0.7.11

### Patch Changes

- add polygonscan + throw error when using fully qualified name as deployment name

## 0.7.10

### Patch Changes

- add sleep option for etherscan to not exceed api rate-limit

## 0.7.9

### Patch Changes

- republish

## 0.7.8

### Patch Changes

- fix typing for etherscan

## 0.7.7

### Patch Changes

- fix etherscan api type + add log option via env var

## 0.7.6

### Patch Changes

- fix vyper + fixes by @guotie

## 0.7.5

### Patch Changes

- add etherscan config, lower solc run for etherscan compatibility, output better error for etherscan task and update deps

## 0.7.4

### Patch Changes

- use peerDependencies instead of optional

## 0.7.3

### Patch Changes

- update dependencies + make ledger support optional to not carry the heavy deps if not used

## 0.7.2

### Patch Changes

- lazy load hre.network to be compatible with plugin which expect to modify it before end + improve global fixture handling on load

## 0.7.1

### Patch Changes

- different naming for Proxied.sol

## 0.7.0

### Minor Changes

- 94092e7: Improve Proxy with support for OpenZeppelin Transparent Proxies

### Patch Changes

- 1840518: use proxy constructor abi for proxied contracts
- c5450ee: Bumps axios from 0.19.2 to 0.21.1.
- 7719b3f: fix proxies deployment
- d704e1a: workaround hardhat_reset snapshot memory loss
- d411d25: add new etherscan endpoint + allow test to access existing deployment (useful for fork testing)
- 0a8fbc3: fix SPDX regex
- 7ded716: fix reset on node --watch + fix msg.value for Proxy + allow receive ETH for Proxy
- 83953c3: default to write deployment to file so can run scripts that deploy contract without losing info
- 8a215f6: Ensure node task do not run on non-hardhat network
- 9da5ba5: add solidity source of Proxied.sol for solidity 0.8
- b15b50f: fix value 0
- 9f3b98f: add env HARDHAT_DEPLOY_ACCOUNTS_NETWORK to specify a different network for named accounts
- d6144a2: allow multiple tags for --tags + add type param for deployments.createFixture
- 543483c: allow multiple folder for deploy script, configurable per network
- 9698753: Add privatekey:// protocol for named accounts
- 1b831fb: fix bug introduced in last changes : node task args were not considered
- f8ebefd: fix supportsInterface for Proxied Contract and fix custom Proxy contract by saving the extended artifacts
- 69be84b: node task reset deployments by default (use --no-reset to not reset)
- 0.7.0
- 6239f31: fix createFixture
- 5b89a3b: log tx hash + wait for tx (where it was not) + add sourcify task (wip)
- fc524e6: fix getUnnamedAccounts : return addresses not named in namedAccounts
- 07d9aa4: fix proxy upgrade
- 4ab4b32: fix types declaration not being published
- 665b57c: Breaking change for external field: isolate external deploy script from other artifacts
- ad70a48: allow to execute proxy deploy after deployment was made elsewhere to actualise the deployment files
- 9bf606d: bring back diamond support
- 4a03db2: from as privateKey fix + clear npm script cache so watch work as intended
- 7035011: add support for ledger hardware wallet
- 5ea8f50: fix deterministic deployment overwrite + add auto account impersonation
- c973c7f: fix external deploy exec order + add export-artifacts task to export extended artifacts
- e82ddb0: better message for tx that need to be executed from other account
- 43c975c: remove new types from hardhat/types module
  If you use typescript in your deploy script and import the `DeployFunction` type for example you ll need to update the import

  from

  ```
  import {HardhatRuntimeEnvironment, DeployFunction} from 'hardhat/types';
  ```

  to

  ```
  import {HardhatRuntimeEnvironment} from 'hardhat/types';
  import {DeployFunction} from 'hardhat-deploy/types';
  ```

- 2c7afa4: add better typing for createFixture options
- 3f81eeb: fix determinsitic diamond redeployment + verifiability of contracts using libraries
- b4a8037: remove abi conflict checks for default transparent proxies
- fad474b: fix wrong link for sourcify and add binance chain for etherscan verification

## 0.7.0-beta.58

### Patch Changes

- Add privatekey:// protocol for named accounts

## 0.7.0-beta.57

### Patch Changes

- fix proxy upgrade

## 0.7.0-beta.56

### Patch Changes

- bring back diamond support

## 0.7.0-beta.55

### Patch Changes

- fix proxies deployment

## 0.7.0-beta.54

### Patch Changes

- remove abi conflict checks for default transparent proxies

## 0.7.0-beta.53

### Minor Changes

- Improve Proxy with support for OpenZeppelin Transparent Proxies

## 0.7.0-beta.52

### Patch Changes

- allow multiple folder for deploy script, configurable per network

## 0.7.0-beta.51

### Patch Changes

- add support for ledger hardware wallet

## 0.7.0-beta.50

### Patch Changes

- add solidity source of Proxied.sol for solidity 0.8

## 0.7.0-beta.49

### Patch Changes

- fix deterministic deployment overwrite + add auto account impersonation

## 0.7.0-beta.48

### Patch Changes

- better message for tx that need to be executed from other account

## 0.7.0-beta.47

### Patch Changes

- add new etherscan endpoint + allow test to access existing deployment (useful for fork testing)

## 0.7.0-beta.46

### Patch Changes

- fix wrong link for sourcify and add binance chain for etherscan verification

## 0.7.0-beta.45

### Patch Changes

- allow to execute proxy deploy after deployment was made elsewhere to actualise the deployment files
- fixed (by @zgorizzo69) for artfiact using full qualified names

## 0.7.0-beta.44

### Patch Changes

- default to write deployment to file so can run scripts that deploy contract without losing info

## 0.7.0-beta.43

### Patch Changes

- fix bug introduced in last changes : node task args were not considered

## 0.7.0-beta.42

### Patch Changes

- add env HARDHAT_DEPLOY_ACCOUNTS_NETWORK to specify a different network for named accounts

## 0.7.0-beta.41

### Patch Changes

- Bumps axios from 0.19.2 to 0.21.1.

## 0.7.0-beta.40

### Patch Changes

- Ensure node task do not run on non-hardhat network

## 0.7.0-beta.39

### Patch Changes

- fix SPDX regex

## 0.7.0-beta.38

### Patch Changes

- from as privateKey fix + clear npm script cache so watch work as intended

## 0.7.0-beta.37

### Patch Changes

- use proxy constructor abi for proxied contracts

## 0.7.0-beta.36

### Patch Changes

- fix supportsInterface for Proxied Contract and fix custom Proxy contract by saving the extended artifacts

## 0.7.0-beta.35

### Patch Changes

- fix getUnnamedAccounts : return addresses not named in namedAccounts

## 0.7.0-beta.34

### Patch Changes

- add better typing for createFixture options

## 0.7.0-beta.33

### Patch Changes

- log tx hash + wait for tx (where it was not) + add sourcify task (wip)

## 0.7.0-beta.32

### Patch Changes

- fix value 0

## 0.7.0-beta.31

### Patch Changes

- fix reset on node --watch + fix msg.value for Proxy + allow receive ETH for Proxy

## 0.7.0-beta.30

### Patch Changes

- node task reset deployments by default (use --no-reset to not reset)

## 0.7.0-beta.29

### Patch Changes

- workaround hardhat_reset snapshot memory loss
- add --fork-deployments for the node task to allow forked chain to get access to deployment from that chain

## 0.7.0-beta.28

### Patch Changes

- Breaking change for external field: isolate external deploy script from other artifacts

## 0.7.0-beta.27

### Patch Changes

- fix determinsitic diamond redeployment + verifiability of contracts using libraries

## 0.7.0-beta.25

### Patch Changes

- fix createFixture

## 0.7.0-beta.24

### Patch Changes

- allow multiple tags for --tags + add type param for deployments.createFixture

## 0.7.0-beta.23

### Patch Changes

- fix external deploy exec order + add export-artifacts task to export extended artifacts

## 0.7.0-beta.22

### Patch Changes

- fix types declaration not being published

## 0.7.0-beta.21

### Patch Changes

- remove new types from hardhat/types module
  If you use typescript in your deploy script and import the `DeployFunction` type for example you ll need to update the import

  from

  ```
  import {HardhatRuntimeEnvironment, DeployFunction} from 'hardhat/types';
  ```

  to

  ```
  import {HardhatRuntimeEnvironment} from 'hardhat/types';
  import {DeployFunction} from 'hardhat-deploy/types';
  ```

## 0.7.0-beta.20

### Patch Changes

- fix --reset order to ensure clearing before fetching deployment
