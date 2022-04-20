# hardhat-deploy

## 0.11.4

### Patch Changes

- add metis block explorer

## 0.11.3

### Patch Changes

- fix proxyAdmin

## 0.11.2

### Patch Changes

- 8bbfbae: add --contract-name to etherscan-verify

## 0.11.1

### Patch Changes

- do not resave, increasing unecessarely numDeployments for diamond

## 0.11.0

### Minor Changes

- 54ad195: revamp diamond support

### Patch Changes

- 3216a31: fix old diamond detection
- e8737d5: fix
- e40546a: fix
- 0810042: diamond : do not save diamondCut + do not resave if no changes
- 5602a44: support old diamond + fix Loupe typo

## 0.11.0-next.5

### Patch Changes

- diamond : do not save diamondCut + do not resave if no changes

## 0.11.0-next.4

### Patch Changes

- fix old diamond detection

## 0.11.0-next.3

### Patch Changes

- support old diamond + fix Loupe typo

## 0.11.0-next.2

### Patch Changes

- fix

## 0.11.0-next.1

### Patch Changes

- fix

## 0.11.0-next.0

### Minor Changes

- revamp diamond support

## 0.10.6

### Patch Changes

- add --contract-name to sourcify to specify only one contract to be verified

## 0.10.5

### Patch Changes

- do nor override original receipt for diamond

## 0.10.4

### Patch Changes

- simplify the export-all format

## 0.10.3

### Patch Changes

- 42e5330: export option for etherscan request, now even with no error

## 0.10.2

### Patch Changes

- more debugging output for etherscan

## 0.10.1

### Patch Changes

- add writePostDataOnError option for etherscan

## 0.10.0

### Minor Changes

- etherscan config updates: use verify + add optin to set apiURL

## 0.9.29

### Patch Changes

- - allow exporting to STDOUT via special - filepath
  - add BUSL-1.1 license support at Etherscan verification tool
  - fix waitConfirmations
  - add --api-url for etherscan-verify

## 0.9.28

### Patch Changes

- support multiple artifacts folder for external deploy script

## 0.9.27

### Patch Changes

- fix facet artifact metadata missing

## 0.9.26

### Patch Changes

- adding onlyOwner for Diamond

## 0.9.25

### Patch Changes

- add facet options

## 0.9.24

### Patch Changes

- implementationName => used a contract by default

## 0.9.23

### Patch Changes

- support proxyArgs for UUPS + allow to specify implementationName to reuse implementation across multiple proxies

## 0.9.22

### Patch Changes

- ensure dir exist for exports

## 0.9.21

### Patch Changes

- remove showAccount as now hardhta-deploy hide it by default unless it is the default test mnemonic, use latest hardhat as peer deps

## 0.9.20

### Patch Changes

- throw if multiple artifact with same not-fully qualified exist from hardhat artifacts

## 0.9.19

### Patch Changes

- remove previousDeployment saving

## 0.9.18

### Patch Changes

- allow etherscan api key config per network

## 0.9.17

### Patch Changes

- support @anders-t/ethers-ledger for ledger support

## 0.9.16

### Patch Changes

- cleanup overrides for ethers

## 0.9.15

### Patch Changes

- use numDeployments instead of history to not have deployment file grow in size too much

## 0.9.14

### Patch Changes

- always setup accounts, was only doing it when loading unnamed or named accounts

## 0.9.13

### Patch Changes

- add --report-gas

## 0.9.12

### Patch Changes

- fix getNetworkName

## 0.9.11

### Patch Changes

- add getNetworkName() which return the forked name if any

## 0.9.10

### Patch Changes

- fix forgot to add readDotFile to types

## 0.9.9

### Patch Changes

- add readDotFile

## 0.9.8

### Patch Changes

- add wau to delete deployment and dotFIles

## 0.9.7

### Patch Changes

- more etherscan-verify destination + saveDotFile

## 0.9.6

### Patch Changes

- if deployment's tx is not found, error out to prevent redeployment by mistake

## 0.9.5

### Patch Changes

- add etherscan for avalanche

## 0.9.4

### Patch Changes

- add arbitrum testnet etherscan + add missing deps

## 0.9.3

### Patch Changes

- fix deterministic function for proxies

## 0.9.2

### Patch Changes

- - fix diamantaire diamonds constructor args generation
  - Allow to define custom deterministic deployment information
  - Skip Implementation deployment if already deployed
  - Delete libraries link from proxy deploymen
  - Add option to wait for specific number of confirmation when deploy a contract
  - allow multiple export files by separating via commas

## 0.9.1

### Patch Changes

- support eip-1559 for pending tx retry and add command line arg to specify globally the maxfee / priorityfee
  support for arbiscan

## 0.9.0

### Minor Changes

- f96f725: EIP-1559

## 0.9.0-next.0

### Minor Changes

- EIP-1559

## 0.8.11

### Patch Changes

- fix artifact info resolution

## 0.8.10

### Patch Changes

- add mumbai for polygonscan

## 0.8.9

### Patch Changes

- tags consider for external deploy scripts

## 0.8.8

### Patch Changes

- remove error when from !+ proxyAdminOwner

## 0.8.7

### Patch Changes

- fix deterministic proxy deployment when using Transparent Proxies (that uses a ProxyAdmin)

## 0.8.6

### Patch Changes

- rework the unknown signer case

## 0.8.5

### Patch Changes

- Revamp the fork handling

## 0.8.4

### Patch Changes

- update dependencies

## 0.8.3

### Patch Changes

- handle pending transactions

## 0.8.2

### Patch Changes

- consider global gasprice everywhere + use latest nonce (not pending)

## 0.8.1

### Patch Changes

- proxy auto fallback on owner to perform upgrade tx

## 0.8.0

### Minor Changes

- 74c35d7: Add companion networks feature allowing to access multiple networks from same deploy script

### Patch Changes

- 3e0d44d: merge new Proxied in
- 0276a09: merge from master fix for coverage
- 0809a58: merge fixes from 0.7
- proxy init option + breaking change: error on non-matching arg length even if implementation constructor has no args
- cb9f57d: support self companion emulation
- 7ecec00: merge from 0.7.11

## 0.8.0-next.5

### Patch Changes

- merge from 0.7.11

## 0.8.0-next.4

### Patch Changes

- merge fixes from 0.7

## 0.8.0-next.3

### Patch Changes

- merge from master fix for coverage

## 0.8.0-next.2

### Patch Changes

- support self companion emulation

## 0.8.0-next.1

### Patch Changes

- merge new Proxied in

## 0.8.0-next.0

### Minor Changes

- Add companion networks feature allowing to access multiple networks from same deploy script

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
