# Hardhat Tasks Available/Updated

hardhat deploy currently add one task to hardhat. But since hardhat-deploy is now just a tiny wrapper around rocketh, you can use rocketh commands too

### 1. hardhat deploy

This plugin adds the _deploy_ task to Hardhat.

This task will execute the scripts in the `deploy` folder and save the contract deployments to disk. These deployments are supposed to be saved for example in a git repository. This way they can be accessed later. But you are free to save them elsewhere and get them back via your mechanism of choice.

With the deployment saved, it allows you to deploy a contract only if changes were made.

Deploy scripts (also called Deploy functions) can also perform arbitrary logic.

For further details on how to use it and write deploy scripts, see [How to Deploy Contracts](./how-to-deploy-contracts.md).

### 2. rocketh-verify

This command is provided by the optional package `@rocketh/verify`

This command will submit the contract source and other info of all deployed contracts to allow services like etherscan, blockscout or sourcify to verify and record the sources.

To execute that command, you need to specify the environment to run against :

```bash
pnpm rocketh-verify -e <environment-name> <etherscan|sourcify|blockscout>
```

For etherscan verification, you just need the ETHERSCAN_API_KEY en variable to be set.
you can use a .env or .env.local file for that as rocketh will load them automatically.

### 3. rocketh-export

This command is provided by the optional package `@rocketh/export`

This command will export the contract deployed (saved in `deployments` folder) to a file with a simple format containing only contract addresses and abi, useful for web apps.

One of the following options need to be set for this task to have any effects :

```bash
rocketh-export -e <environment-name> --ts <path-to-contracts.ts>
```
