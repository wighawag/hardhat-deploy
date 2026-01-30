<h1>hardhat-deploy</h1>

_A [Hardhat](https://hardhat.org) Plugin For Replicable Deployments And Easy Testing_

> **Note: This is the documentation for hardhat-deploy v2 that works with [hardhat v3](https://hardhat.org/hardhat3-alpha)**
>
> Documentation for hardhat-deploy v1 can be found on the [v1 branch](https://github.com/wighawag/hardhat-deploy/tree/v1#readme)

## Overview

**hardhat-deploy** makes it easy for you to deploy your EVM smart contracts across many chains while keeping track of them and replicating the same environment for testing.

It adds a mechanism to associate names to addresses, so test and deployment scripts can be reconfigured by simply changing the address a name points to. This results in much clearer tests and deployment scripts — no more `accounts[0]` in your code.

## Why hardhat-deploy + rocketh?

While Hardhat's official [Ignition](https://hardhat.org/ignition) plugin offers a robust deployment system, it comes with a rigid DSL that limits flexibility. **hardhat-deploy + rocketh** provides:

- **Intuitive Deployment Scripts**: Write deployment logic in plain TypeScript without learning a new DSL.
- **Browser-Compatible Deployments**: Thanks to [rocketh](https://github.com/wighawag/rocketh)'s framework-agnostic design, your deployment scripts can be executed directly in the browser — enabling in-app deployments, testing in web environments, and seamless integration with web frontends.
- **Hot Contract Replacement (HCR)**: The equivalent of HMR (Hot Module Replacement) for smart contracts. Edit your contracts and see changes live while developing your app or game using proxy patterns with conventions that make it work seamlessly.
- **Flexible Proxy Patterns**: Declarative proxy deployment with `deployViaProxy` for upgradeable contracts, including support for [OpenZeppelin](https://openzeppelin.com) transparent proxies.
- **Diamond Support**: Deploy [EIP-2535 Diamonds](https://eips.ethereum.org/EIPS/eip-2535) declaratively — specify the new state and let hardhat-deploy generate the `diamondCut` for you.
- **Full Control**: Access to all deployment parameters and lifecycle hooks.

## Architecture

Version 2 is a full rewrite that has been used in production for several years. It is fully modular, making it much easier to contribute new deployment mechanisms.

Under the hood, hardhat-deploy uses [rocketh](https://github.com/wighawag/rocketh), a framework-agnostic system that provides a minimal API to save and load deployments. Everything else is handled by external modules:

| Module                  | Description                                            |
| ----------------------- | ------------------------------------------------------ |
| `@rocketh/deploy`       | Provides a `deploy` function to deploy contracts       |
| `@rocketh/proxy`        | Deploy proxies declaratively like in hardhat-deploy v1 |
| `@rocketh/diamond`      | Deploy diamonds declaratively                          |
| `@rocketh/read-execute` | Helpers for reading and executing transactions         |
| `@rocketh/viem`         | viem client integration                                |

You can also provide your own modules for advanced use cases.

## Getting Started

To get started with hardhat-deploy, see the [Installation Guide](./installation.md), or jump straight into learning [How to Deploy Contracts](./how-to-deploy-contracts.md).

For a production-ready setup, check out the [template-ethereum-contracts](https://github.com/wighawag/template-ethereum-contracts) template.
