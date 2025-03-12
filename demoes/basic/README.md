# A template for EVM-based smart contract development

A template for developing EVM smart contract using hardhat (v3) and hardhat-deploy (v2)

## How to use it?

### Compile your contracts

```bash
pnpm compile
```

### Test your contracts

```bash
pnpm test
```

This will test both solidity and node test (as hardhat v3 does)

### watch for changes and rebuild automatically

```bash
pnpm compile:watch
```

### deploy your contract

- on localhost

  This assumes you have a local node running: `pnpm local_node`

  ```bash
  pnpm run deploy localhost
  ```

- on a network of your choice

  Just make sure you have your .env.local setup, see [.env](.env) or if you use hardhat secret store, configure it

  ```bash
  pnpm run deploy <network>
  ```

### execute scripts

```bash
pnpm execute <network name> scripts/setMessage.ts
```

or if you want to execute in a forked environment :

```bash
pnpm fork:execute <network name> scripts/setMessage.ts "Hello world"
```

### zellij

[zellij](https://zellij.dev/) is a useful multiplexer (think tmux) for which we have included a [layout file](./zellij.kdl) to get started

Once installed simply run the following to get a local in-memory Ethereum node running along with the tests

```bash
pnpm start
```

if you want to try Zellij without installing it, try this :

```bash
bash <(curl -L zellij.dev/launch) --layout zellij.kdl
```

In the shell in the upper pane, you execute the script as mentioned above

```bash
pnpm execute localhost scripts/setMessage.ts "Hello everyone"
```

## Initial Setup

You need to have these installed

- [nodejs](https://nodejs.org/en)

- [pnpm](https://pnpm.io/)

  ```bash
  npm i -g pnpm
  ```

Then you need to install the local dependencies with the following command:

```bash
pnpm i
```

We also recommend installing [Zellij](https://zellij.dev/) to have your dev env setup in one go via `pnpm start`
