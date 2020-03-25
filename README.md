# BUIDLER-DEPLOY : A [Buidler](https://buidler.dev) Plugin For Deployments

This [buidler](https://buidler.dev) plugin add a mechanism to deploy contract to various network, keeping track of them and replicate the same environment for testing.

On top of that it adds a mechanism to add names to addresses so test and deployment script can be reconfigured by simply changing the address a name points to, allowing different configuration per network.

## Tasks

### deploy

`buidler deploy --network <networkName>`

This is a new task that the plugin add. As the name suggests it deploy contracts.
To be exact it will look for files in the folder `deploy` or whatever was configured in `paths.deploy`

It will scan for file in alphabetical order and execute them in turn.
- it will `require` each of these file and execute the exported function with the BRE as argument

An example of a deploy script :

```
module.exports = async ({namedAccounts, deployments}) => {
    const {deployIfDifferent, log} = deployments;
    const {deployer} = namedAccounts;

    let contract = deployments.get('GenericMetaTxProcessor');
    if (!contract) {
        const deployResult = await deployIfDifferent(['data'], "GenericMetaTxProcessor",  {from: deployer, gas: 4000000}, "GenericMetaTxProcessor");
        contract = deployments.get('GenericMetaTxProcessor');
        if(deployResult.newlyDeployed) {
            log(`GenericMetaTxProcessor deployed at ${contract.address} for ${deployResult.receipt.gasUsed}`);
        }
    }
}
```

As you can see the BRE passed in has 2 new fields :
- namedAccounts that is an object where keys are names and value are addresses. It is parsed from the namedAccounts configuration (see namedAccounts)
- deployments which contains functions to access past deployment or save new one, as well as helpers functions


Note that running `buidler deploy` without network will use the defautl network. If the default network is an internal ganache or buidlerevm then nothing will happen as a result but this can be used to ensure the deployment is without issues.

### test

`buidler test`

The test task is like normal except that names are resolved and past deployment are loaded.

test can then use the `bre.deployments.run` function to run the deployment for the test.
You can for example set them in a `beaforeEach`

You can also specify to run a subset of the deploy scripts by specifying a tag or an array of tag

A tag is simply a string value, that deploy script can advertise. (see tags and dependencies)

Here is an example of a test :

```
const { deployments } = require('@nomiclabs/buidler');

describe("Token", () => {
    beforeEach(async () => {
      await deployments.run(['ERC721BidSale']);
    })
    it("testing 1 2 3", async function() {
      const Token = deployments.get('Token'); // Token is available because Token is a dependency of ERC721BidSale deploy script
      console.log(Token.address);
      const ERC721BidSale = deployments.get('ERC721BidSale');
      console.log({ERC721BidSale});
    });
});
```

### node

`buidler node`

The node command is updated so that now when the node is serving, all contract are already deployed.

It also add an argument `--export` that allow you to specify a destination file where the info about all contracts deployed (across networks) is written.
Your webapp can then access all contracts information.

Note: for now, you have to use `buidler listen` instead of `buidler node` as buidler does not let plugin add options to existing task yet.

### run

`buidler run <script>`

The run command is also updated in that now when the script run it has access to contract deployment and can easily act on them via helpers functions

Here is an example of script that run can support

```
const bre = require('@nomiclabs/buidler');
const { deployments, namedAccounts } = bre;

console.log(deployments.all())
console.log({namedAccounts});
```


### compile

`buidler compile`

The compile command is also updated so that you could potentially have the compiler do different thing depending on the deployed contract. Like for example you might want to inject the address of a deployed contract in the bytecode for efficiency reason.
This is not yet enable in any way though. 


## Configuration

### namedAccounts

namedAccounts allow you to associate names to addresses and have them configured per chain.
This allow you to have meaningful name in your tests while the addresses matches to multi sig in real network for example

```js
{
    namedAccounts: {
        deployer: {
            default: 0, // here this will by default take the first account as deployer
            4: '0xffffeffffff', // but for rinkeby it will be a specific address
        },
        feeCollector:{
            default: 1, // here this will by default take the second account as feeCollector (so in the test this will be a different account that the deployer)
            1: '0xffffeaaa', // on the mainnet the feeCollector could be a multi sig
            4: '0xaaaeffffff', // on rinkeby it could be another account
        }
    }
}
```


### paths

Here is the default value for the path. You can change them as suits you :

```js
{
    paths: {
        deploy: 'deploy',
        deployments: 'deployments'
    }
}
```

## deploy scripts tags and dependencies

When you run test, you want to replicate the same set of contract that will be deployed without having to copy the deployment procedure.
That is why the test have access to `bre.deployments.run` function to be able to easily setup the contracts for testing.
Now though, for efficiency reason it would be nice if you could only deploy the necessary contract for a particular test.

To help doing that, deploy script can setup tags and dependencies.

tags represent what the deploy script act on. In general it will be a single string value, the name of the contract it deploy or modify

Then if another deploy script have such tag as dependency, then when this latter deploy script have a specific tag and that tag is requested, the dependency will be executed first.

Here is an example of 2 deploy scripts :

```js
module.exports = async ({namedAccounts, deployments}) => {
    const {deployIfDifferent, log} = deployments;
    const {deployer} = namedAccounts;
    const deployResult = await deployIfDifferent('data', 'Token', {from: deployer}, 'Token');
    if (deployResult.newlyDeployed) {
        log(`contract Token deployed at ${deployResult.contract.address} using ${deployResult.receipt.gasUsed} gas`);
    }
}
module.exports.tags = ['Token'];
```


```js
module.exports = async function({namedAccounts, deployments}) {
    const {deployIfDifferent, log} = deployments;
    const {deployer} = namedAccounts;
    const Token = deployments.get('Token');
    const deployResult = await deployIfDifferent('data', 'ERC721BidSale', {from: deployer}, 'ERC721BidSale', Token.address, 1, 3600);
    if (deployResult.newlyDeployed) {
        log(`contract ERC721BidSale deployed at ${deployResult.contract.address} using ${deployResult.receipt.gasUsed} gas`);
    }
};
module.exports.tags = ['ERC721BidSale'];
module.exports.dependencies = ['Token'];
```

As you can see the second one depends on the first. This is because the second depends on a tag that the first script register as using.

With that when `bre.deployments.run` is executed as follow :

```js
bre.deployments.run(['ERC721BidSale'])
```

then both script will be run, ensuring ERC721BidSale is ready

