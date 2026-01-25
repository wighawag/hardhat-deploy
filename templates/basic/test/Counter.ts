import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { network } from 'hardhat';
import { Abi_Counter } from "../generated/abis/Counter.js";

// note we need to import loadAndExecuteDeploymentsFromFiles from ../rocketh/environment.js to get the type support
import { loadAndExecuteDeploymentsFromFiles } from "../rocketh/environment.js";

const { provider, networkHelpers, viem } = await network.connect();
async function deployAll() {
  const env = await loadAndExecuteDeploymentsFromFiles({
    provider: provider,
  });

  return { env };
}

describe("Counter", async function () {

  it("Should emit the Increment event when calling the inc() function", async function () {
    const { env } = await networkHelpers.loadFixture(deployAll);

    const CounterContract = env.viem.getWritableContract<Abi_Counter>("Counter", { account: env.namedAccounts["deployer"] });
    await viem.assertions.emitWithArgs(
      CounterContract.write.inc(),
      CounterContract,
      "Increment",
      [1n],
    );
  });

  it("The sum of the Increment events should match the current value", async function () {
    const { env } = await networkHelpers.loadFixture(deployAll);
    const publicClient = env.viem.publicClient;
    const deploymentBlockNumber = await publicClient.getBlockNumber();

    const CounterContract = env.viem.getWritableContract<Abi_Counter>("Counter", { account: env.namedAccounts["deployer"] });

    // run a series of increments
    for (let i = 1n; i <= 10n; i++) {
      await CounterContract.write.incBy([i]);
    }

    const events = await publicClient.getContractEvents({
      address: CounterContract.address,
      abi: CounterContract.abi,
      eventName: "Increment",
      fromBlock: deploymentBlockNumber,
      strict: true,
    });

    // check that the aggregated events match the current value
    let total = 0n;
    for (const event of events) {
      total += event.args.by;
    }

    assert.equal(total, await CounterContract.read.x());
  });
});
