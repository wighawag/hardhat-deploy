# Deploying contracts that have libraries

In the deploy function, one of the `DeployOptions` that can be passed into the function is `libraries`.

First, deploy the library using the `deploy` function, then when we deploy a contract that needs the the linked library, we can pass the deployed library name and address in as an argument to the `libraries` object.

```
const exampleLibrary = await deploy("ExampleLibary", {
    from: <deployer>
    contractName: "ExampleLibrary"
});

```

ExampleLibrary is now deployed to whatever network is in the context of the environment.

For example, if we are deploying on Rinkeby, this library will get deployed on rinkeby, and the `exampleLibrary` variable will be an artifact that contains the abi as well as the deployed address for the contract.

Now that the library is deployed, we can link it in our next deployed contract.

```
const example = await deploy("Example", {
    from: <deployer>
    contractName: "Example",
    args: ["This is an example string argument in the constructor for the 'Example' contract"],
    libraries: {
        ["ExampleLibrary"]: exampleLibrary.address
    }
});

```

This `libraries` object takes the name as a string of the library, and its deployed address on the network. Multiple libraries can be passed into the `libraries` object.

This works on buidler-deploy version `0.4.10`.
