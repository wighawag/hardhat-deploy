# How to Deploy Contracts

---

### The `deploy` Task

`hardhat --network <networkName> deploy`

This is a new task that the `hardhat-deploy` adds. As the name suggests it deploys contracts.
To be exact it will look for files in the folder `deploy`

It will scan for files in alphabetical order and execute them in turn.

- it will `import` each of these files and execute the exported function

To specify the environment, you can use the builtin hardhat argument `--network <network name>`

> :warning: Note that running `hardhat deploy` without specifying an environment will use the default hardhat's network. If the default network is an in-memory network then nothing will happen as a result as everything happens in memory, but this can be used to ensure the deployment is without issues.

---

### Deploy Scripts

deploy scripts are simple javascript/typescript modules that export a function that will be executed with the environment as argument.

and to get the most of hardhat-deploy, the way to define them is to call the `deployScript` function exported by `rocketh/deploy.js`

For example this script will deploy the `GreetingsRegistry` contract

```typescript
import { deployScript, artifacts } from "../rocketh/deploy.js";
export default deployScript(
  async ({ deploy, namedAccounts }) => {
    const { deployer } = namedAccounts;

    await deploy("GreetingsRegistry", {
      account: deployer,
      artifact: artifacts.GreetingsRegistry,
      args: [""],
    });
  },

  { tags: ["GreetingsRegistry", "GreetingsRegistry_deploy"] },
);
```

The tags is a list of string that when the _deploy_ task is executed with, the script will be executed (unless it skips). In other word if the deploy task is executed with a tag that does not belong to that script, that script will not be executed unless it is a dependency of a script that does get executed.

The dependencies is a list of tag that will be executed if that script is executed. So if the script is executed, every script whose tag match any of the dependencies will be executed first.

Finally the function can return true if it wishes to never be executed again. This can be useful to emulate migration scripts that are meant to be executed only once. Once such script return true (async), the `id` field is used to track execution and if that field is not present when the script return true, it will fails.

In other words, if you want a particular deploy script to run only once, it needs to both return true (async) and have an `id` set.

In any case, as a general advice every deploy function should be idempotent. This is so they can always recover from failure or pending transaction. This is what underpin most of hardhat-deploy philosophy.

This is why the `deploy` function provided by `@rocketh/deploy` will by default only deploy if the contract code has changed, making it easier to write idempotent script.

### Environment and function provided by rocketh modules

By default rocketh environment only provide function to read and write deployments. It has no `deploy` function on its own.

These are provided by external modules but few are already available like `@rocketh/deploy`, `@rocketh/proxy` and `@rocketh/diamond` each with its own specific use case.

#### `@rocketh/deploy`

#### `@rocketh/proxy`

#### `@rocketh/diamond`

## Handling contract using libraries

In the deploy function, one of the `DeployOptions` field is the `libraries` field. It allows you to associate external contract as libraries at the time of deployment.

First, you have deploy the library using the `deploy` function, then when we deploy a contract that needs the linked library, we can pass the deployed library name and address in as an argument to the `libraries` object.

First step: deploy the library:

```js
const exampleLibrary = await deploy("ExampleLibary", {
  artifact: artifacts.ExampleLibary,
    from: <deployer>
});

```

ExampleLibrary is now deployed to whatever environment was chosen (`hardhat deploy --network <environment-name>`)

For example, if we are deploying on Sepolia, this library will get deployed on sepolia, and the `exampleLibrary` variable will be a deployment object that contains the abi as well as the deployed address for the contract.

Now that the library is deployed, we can link it in our next deployed contract.

```js
const example = await deploy(
  "Example",
  {
    account: deployer,
    artifact: artifacts.Example,
    args: ["example string argument for the 'Example' contract constructor"],
  },
  {
    libraries: {
      ExampleLibrary: exampleLibrary.address,
    },
  },
);
```

This `libraries` object takes the name of the library, and its deployed address on the network. Multiple libraries can be passed into the `libraries` object.
