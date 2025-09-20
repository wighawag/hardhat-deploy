<h1> hardhat-deploy</h1>

_A [Hardhat](https://hardhat.org) Plugin For Replicable Deployments And Easy Testing_

> **Note: This is the documentation for hardhat-deploy v2 that works with [hardhat v3](https://hardhat.org/hardhat3-alpha)**
>
> Documentation for hardhat-deploy v1 can be found on the [v1 branch](https://github.com/wighawag/hardhat-deploy/tree/v1#readme)

**hardhat-deploy** make it easy for you to deploy your EVM smart contracts across many chains.

The version 2 is a full rewrite that has been already used in production for several years. It does not support yet all the features of version 1 but is fully modular and it is thus much easier to contribute to new deployment mechanism.

Under the hood, hardhat-deploy uses [rocketh](https://github.com/wighawag/rocketh) a framework agnostic system that provide a minimal api to save and load deployment.

Everything else is handled by external module. For example `@rocketh/deploy` give you a deploy function that you can use to deploy contracts.
But you can provide your own module for advanced use case.

There are already a few like `@rocketh/proxy` to deploy proxy declaratively like in hardhat-deploy v1 or `@rocketh/diamond` to deploy diamond declaratively.

## Documentation:

Please find the [documentation here](https://rocketh.dev/hardhat-deploy)
