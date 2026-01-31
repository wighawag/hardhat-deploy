# What is it for?

This hardhat plugin adds a mechanism to deploy contracts to any network, keeping track of them and replicating the same environment for testing.

It also adds a mechanism to associate names to addresses, so test and deployment scripts can be reconfigured by simply changing the address a name points to, allowing different configurations per network. This also results in much clearer tests and deployment scripts (no more accounts[0] in your code).

This plugin contains a lot more features too, all geared toward a better developer experience :

- chain configuration export (via @rocketh/export)
  (listing deployed contracts' addresses and their abis (useful for web apps))
- library linking at the time of deployment.
- deterministic deployment across networks.
- support for specific deploy script per environment (L1 vs L2 for example)
- deployment dependency system (allowing you to only deploy what is needed).
- deployment retrying (by saving pending tx): so you can feel confident when making a deployment that you can always recover.
- deployments as test fixture via hardhat helpers
- ability to export the deployment scripts themselves to be used in other projects
- contains helpers to read and execute transaction on deployed contract referring to them by name.
- save metadata of deployed contract so they can always be fully verified, via sourcify or etherscan.
- ability to submit contract source to etherscan and sourcify for verification at any time. (Because hardhat-deploy will save all the necessary info, it can be executed at any time.)
- support hardhat's fork feature so deployment can be accessed even when run through fork.
- named accounts are automatically impersonnated too, so you can perform tx as if you had their private key.
- declarative proxy deployment with ability to upgrade them transparently, only if code changes.
- this include support for [openzeppelin](https://openzeppelin.com) transparent proxies
- diamond deployment with facets, allowing you to focus on what the new version will be. It will generate the diamondCut necessary to reach the new state.
- support HRC (Hot Contract Replacement) via special proxy mechanism and file watch setup
