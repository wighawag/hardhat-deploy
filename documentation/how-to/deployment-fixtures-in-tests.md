# How to Use Deployment Fixtures in Tests

Deployment fixtures allow you to use the same deployment scripts in your tests, ensuring consistency between your deployment and testing environments. This guide shows you how to set up and use fixtures effectively.

## What are Deployment Fixtures?

Deployment fixtures are a way to:
- Reuse deployment scripts in tests
- Ensure tests use the same deployment logic as production
- Cache deployments for faster test execution
- Maintain consistency between environments

## Basic Setup

### Test Utilities Setup

Create a test utilities file to set up fixtures:

```typescript
// test/utils/index.ts
import { EthereumProvider } from "hardhat/types/providers";

export function setupFixtures(provider: EthereumProvider) {
  return {
    async deployAll() {
      const env = await loadAndExecuteDeploymentsFromFiles({
        provider: provider,
      });

      // Type the deployments for better IDE support
      const Greeter = env.get<typeof artifacts.Greeter.abi>("Greeter");

      return {
        env,
        Greeter,
        namedAccounts: env.namedAccounts,
        unnamedAccounts: env.unnamedAccounts,
      };
    },
  };
}

```

### Basic Test Structure

```typescript
// test/Greeter.test.ts
import { expect } from "earl";
import { describe, it } from "node:test"; // using node:test as hardhat v3 do not support vitest
import { network } from "hardhat";
import { setupFixtures } from "./utils/index.js";

const { provider, networkHelpers } = await network.connect();
const { deployAll } = setupFixtures(provider);

describe("Greeter", function () {
  it("basic test", async function () {
    const { env, Greeter, unnamedAccounts } = await networkHelpers.loadFixture(
      deployAll
    );
    const greetingToSet = "hello world";
    const greeter = unnamedAccounts[0];
    await expect(
      await env.read(Greeter, {
        functionName: "greet",
        args: [],
      })
    ).toEqual("");

    await env.execute(Greeter, {
      functionName: "setGreeting",
      args: [greetingToSet],
      account: greeter,
    });

    await expect(
      await env.read(Greeter, {
        functionName: "greet",
        args: [],
      })
    ).toEqual(greetingToSet);
  });
});
```

