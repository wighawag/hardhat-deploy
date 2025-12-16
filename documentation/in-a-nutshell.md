# hardhat-deploy in a nutshell

Before going into the details, here is a very simple summary of the basic feature of **hardhat-deploy**.

**hardhat-deploy** allows you to write [`deploy scripts`](#deploy-scripts) in the `deploy` folder. Each of these files that look as follows will be executed in turn when you execute the following task: `hardhat --network <environmentName> deploy`


Note that while hardhat call "network "the environment on which the contract will be deployed, multiple network can point to the same chain. We thus prefers to call them "environment"

```js
import { deployScript, artifacts } from "../rocketh/deploy.js";

export default deployScript(
  // this allow us to define our deploy function which takes as first argument an environment object
  // This contains the function provided by the modules imported in 'rocketh.ts'
  // along with other built-in functions and the named accounts
  async ({ deployViaProxy, namedAccounts }) => {
    const { deployer, admin } = namedAccounts;

    const prefix = "proxy:";
    await deployViaProxy(
      "GreetingsRegistry",
      {
        account: deployer,
        artifact: artifacts.GreetingsRegistry,
        args: [prefix],
      },
      {
        owner: admin,
        linkedData: {
          prefix,
          admin,
        },
      }
    );
  },
  // execute takes as a second argument an options object where you can specify tags and dependencies
  { tags: ["GreetingsRegistry", "GreetingsRegistry_deploy"] }
);
```

Furthermore you can also ensure these scripts are executed in test too by calling `await loadAndExecuteDeployments({provider: provider,});` in your tests.

Amd you can call these in hardhat test fixture to benefit from caching optimization.

This is a huge benefit for testing since you are not required to replicate the deployment procedure in your tests. 

You can even group deploy scripts in different sub-folders and ensure they are executed in their logical order.
