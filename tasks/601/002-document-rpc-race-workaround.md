---
id: "601-002"
issue: 601
title: "Document RPC read-after-deploy race condition and waitForDeployment usage"
depends_on: ["601-001"]
---

## Description

After adding the `waitForDeployment` helper (task 601-001), the documentation needs to be updated to:

1. Warn users about the RPC read-after-write race condition on load-balanced public RPCs (Alchemy, Infura, etc.)
2. Show how to use `waitForDeployment` to mitigate the issue
3. Explain when this is needed (remote testnets/mainnets) vs. when it's not (local Hardhat/EDR networks)

This is important because the race condition is a common pain point for users migrating from v1 (where ethers handled it implicitly) and for new users following tutorials that deploy-then-read in the same script.

## Acceptance Criteria

- The "How to Deploy Contracts" documentation page mentions the RPC race condition and links to the `waitForDeployment` helper
- A new section or callout in `documentation/how-to-deploy-contracts.md` explains:
  - **When** the issue occurs (remote RPCs with load balancing, especially testnets)
  - **Why** it happens (v2 uses explicit behavior; no implicit polling like v1/ethers)
  - **How** to fix it using `waitForDeployment` with a concrete code example
- The documentation is accurate and uses the correct import path (`hardhat-deploy/helpers`)

## Implementation Notes

### Files to modify

1. **`documentation/how-to-deploy-contracts.md`** — Add a new section about the RPC race condition and `waitForDeployment`

### Where to add the section

Add a new section after the existing deploy script examples, before the "Handling contracts using libraries" section. A good heading would be something like:

```markdown
### Reading from a contract right after deploying

When deploying to remote networks (testnets or mainnets) through load-balanced RPC providers like Alchemy or Infura, ...
```

### Content to include

1. Describe the problem: after `deploy()` returns, a subsequent `read()` can fail with `AbiDecodingZeroDataError` because `eth_call` may hit a stale RPC replica
2. Note that this does NOT happen on local Hardhat/EDR networks (single-node, no replication)
3. Show the fix using `waitForDeployment`:

```typescript
import { waitForDeployment } from 'hardhat-deploy/helpers';

export default deployScript(
  async ({ deploy, namedAccounts, network }) => {
    const { deployer } = namedAccounts;

    const myContract = await deploy("MyContract", {
      account: deployer,
      artifact: artifacts.MyContract,
      args: [deployer],
    });

    // On remote RPCs, wait for the contract code to be observable
    if (myContract.newlyDeployed) {
      await waitForDeployment(network.provider, myContract);
    }

    // Now safe to read
    const value = await read(myContract, { functionName: "someView" });
  },
  { tags: ["MyContract"] },
);
```

4. Briefly mention the `confirmationsRequired` chain-level config in `rocketh/config.ts` as an alternative for network-wide settings

### Conventions

- Follow the existing documentation style in `documentation/how-to-deploy-contracts.md` (Markdown, code fences with `typescript` language tags)
- Use the existing heading hierarchy (h3 `###` for subsections)
- Keep explanations concise — this is a how-to guide, not a deep dive
