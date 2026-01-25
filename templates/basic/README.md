# Sample Hardhat 3 Project (`node:test`)

This project showcases a Hardhat 3 project using the [hardhat-deploy](https://github.com/wighawag/hardhat-deploy) plugin (along with the [rocketh](https://github.com/wighawag/rocketh) deployment system) and the native Node.js test runner (`node:test`) .

To learn more about hardhat-deploy and rocketh, please visit the [documentation](https://rocketh.dev).

## Project Overview

This example project includes:

- A simple Hardhat configuration file.
- Foundry-compatible Solidity unit tests.
- Built-in mechanism to load deployments in test via hardhat-deploy and rocketh.

## Usage

### Running Tests

To run all the tests in the project, execute the following command:

```bash
pnpm hardhat test
```

You can also selectively run the Solidity or `node:test` tests:

```bash
pnpm hardhat test solidity
pnpm hardhat test nodejs
```

### Deploying Contracts

To deploy the contracts to an in-memory network, run:

```bash
pnpm hardhat deploy
```

To deploy the contracts to a specific network, use the `--network` option:

```bash
pnpm hardhat deploy --network <network-name>
```
