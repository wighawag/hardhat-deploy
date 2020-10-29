# hardhat-deploy

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
