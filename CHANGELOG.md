# hardhat-deploy

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
