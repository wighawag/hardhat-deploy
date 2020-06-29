[![buidler](https://buidler.dev/buidler-plugin-badge.svg?1)](https://buidler.dev)
# buidler-deploy

_A Plugin For Deployments_

[Buidler](http://getbuidler.com) Deployment Plugin. 

## What

This [buidler](https://buidler.dev) plugin add a mechanism to deploy contract to various network, keeping track of them and replicate the same environment for testing.

On top of that it adds a mechanism to add names to addresses so test and deployment script can be reconfigured by simply changing the address a name points to, allowing different configuration per network.

## Installation


```bash
npm install buidler-deploy
```

And add the following statement to your `buidler.config.js`:

```js
usePlugin('buidler-deploy');
```

## Tasks

This plugin adds the _deploy_ task to Buidler

This tasks will be executing scripts in the `deploy` folder and save contract deployments


## Environment extensions

This plugin extends the Buidler Runtime Environment by adding 2 fields
- namedAccounts that is an object where keys are names and value are addresses. It is parsed from the namedAccounts configuration (see Configuration)
- deployments which contains functions to access past deployment or save new one, as well as helpers functions


## Configuration

### namedAccounts

This plugin extends the `BuidlerConfig`'s object with an optional 
`namedAccounts` field.

`namedAccounts` allow you to associate names to addresses and have them configured per chain.
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

It also add fields to  `BuidlerConfig`'s `ProjectPaths` object

Here is an example showing the default values :

```js
{
    paths: {
        deploy: 'deploy',
        deployments: 'deployments'
    }
}
```


## Usage

### deploy

`buidler deploy --network <networkName>`

This is a new task that the plugin add. As the name suggests it deploy contracts.
To be exact it will look for files in the folder `deploy` or whatever was configured in `paths.deploy`

It will scan for file in alphabetical order and execute them in turn.
- it will `require` each of these file and execute the exported function with the BRE as argument

An example of a deploy script :

```
module.exports = async ({getNamedAccounts, deployments}) => {
    const {deploy} = deployments;
    const {deployer} = await getNamedAccounts();

    await deploy("GenericMetaTxProcessor",  {from: deployer, gas: 4000000}, args: []});
}
```

As you can see the BRE passed in has 2 new fields :
- getNamedAccounts a function that return a promise to an object where keys are names and value are addresses. It is parsed from the namedAccounts configuration (see namedAccounts)
- deployments which contains functions to access past deployment or save new one, as well as helpers functions


Note that running `buidler deploy` without network will use the default network. If the default network is an internal ganache or buidlerevm then nothing will happen as a result but this can be used to ensure the deployment is without issues.

### test

`buidler test`

The test task is like normal except that names are resolved and past deployment are loaded.

test can then use the `bre.deployments.fixture` function to run the deployment for the test and snapshot it so test do not need to perform the all deploy flow, they simply reuse the snapshot for every test (this leverage `evm_snapshot` and `evm_revert` provided by both `buidlerevm` and `ganache`).
You can for example set them in a `beaforeEach`

You can also specify to run a subset of the deploy scripts by specifying a tag or an array of tag

A tag is simply a string value, that deploy script can advertise. (see tags and dependencies)

Here is an example of a test :

```
const { deployments } = require('@nomiclabs/buidler');

describe("Token", () => {
    beforeEach(async () => {
      await deployments.fixture();
    })
    it("testing 1 2 3", async function() {
      const Token = await deployments.get('Token'); // Token is available because Token is a dependency of ERC721BidSale deploy script
      console.log(Token.address);
      const ERC721BidSale = await deployments.get('ERC721BidSale');
      console.log({ERC721BidSale});
    });
});
```

### node

`buidler node`

The node command is updated so that now when the node is serving, all contract are already deployed.

It also add an argument `--export` that allow you to specify a destination file where the info about the contracts deployed is written.
Your webapp can then access all contracts information.

### run

`buidler run <script>`

The run command is also updated in that now when the script run it has access to contract deployment and can easily act on them via helpers functions

Here is an example of script that run can support

```
const bre = require('@nomiclabs/buidler');
const { deployments, getNamedAccounts } = bre;

(async() => {
    console.log(await deployments.all())
    console.log({namedAccounts: await getNamedAccounts()});
})()
```
You can also run it directly from the command line as usual.

### console 

`buidler console`

The same applies to the `console` task

### compile

`buidler compile`

The compile command is also updated so that you could potentially have the compiler do different thing depending on the deployed contract. Like for example you might want to inject the address of a deployed contract in the bytecode for efficiency reason.
This is not yet enabled in any way though. 


## deploy scripts tags and dependencies

These following paragraphs were written before the `deployments.fixture` function was implemented and while it is possible to run a subset of the deploy scripts via `run` this is now mostly useful for partial deployment, in script for example as tests can now benefit from an even faster method via `deployments.fixture`

When you run test, you want to replicate the same set of contract that will be deployed without having to copy the deployment procedure.
That is why the test have access to `bre.deployments.run` function to be able to easily setup the contracts for testing.
Now though, for efficiency reason it would be nice if you could only deploy the necessary contract for a particular test.

To help doing that, deploy script can setup tags and dependencies.

tags represent what the deploy script act on. In general it will be a single string value, the name of the contract it deploy or modify

Then if another deploy script have such tag as dependency, then when this latter deploy script have a specific tag and that tag is requested, the dependency will be executed first.

Here is an example of 2 deploy scripts :

```js
module.exports = async ({getNamedAccounts, deployments}) => {
    const {deployIfDifferent, log} = deployments;
    const namedAccounts = await getNamedAccounts();
    const {deployer} = namedAccounts;
    const deployResult = await deploy('Token', {from: deployer, args: ["hello", 100]});
    if (deployResult.newlyDeployed) {
        log(`contract Token deployed at ${deployResult.contract.address} using ${deployResult.receipt.gasUsed} gas`);
    }
}
module.exports.tags = ['Token'];
```


```js
module.exports = async function({getNamedAccounts, deployments}) {
    const {deployIfDifferent, log} = deployments;
    const namedAccounts = await getNamedAccounts();
    const {deployer} = namedAccounts;
    const Token = await deployments.get('Token');
    const deployResult = await deploy('Sale', {from: deployer, contractName: 'ERC721BidSale', args: [Token.address, 1, 3600]});
    if (deployResult.newlyDeployed) {
        log(`contract Sale deployed at ${deployResult.contract.address} using ${deployResult.receipt.gasUsed} gas`);
    }
};
module.exports.tags = ['Sale'];
module.exports.dependencies = ['Token'];  // this ensure the TOken script above is executed first, so `deployments.get('Token') succeeds
```

As you can see the second one depends on the first. This is because the second depends on a tag that the first script register as using.

With that when `bre.deployments.run` is executed as follow :

```js
bre.deployments.run(['Sale'])
```

then both script will be run, ensuring Sale is ready


You can also define the script as running after other script are run by setting `runAtTheEnd` to be true

Like the following:

```js
module.exports = async function({getNamedAccounts, deployments}) {
    const {deployIfDifferent, execute, log} = deployments;
    const namedAccounts = await getNamedAccounts();
    const {deployer, admin} = namedAccounts;
    await execute("Sale", {from: deployer}, "setAdmin", admin);
};
module.exports.tags = ['Sale'];
module.exports.runAtTheEnd = true;
```
