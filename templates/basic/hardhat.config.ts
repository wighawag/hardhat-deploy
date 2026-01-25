import { configVariable, defineConfig } from "hardhat/config";
import hardhatNodeTestRunnerPlugin from "@nomicfoundation/hardhat-node-test-runner";
import hardhatKeyStorePlugin from "@nomicfoundation/hardhat-keystore";
import hardhatNetworkHelpersPlugin from "@nomicfoundation/hardhat-network-helpers";
import hardhatViemPlugin from "@nomicfoundation/hardhat-viem";
import hardhatViemAssertionsPlugin from "@nomicfoundation/hardhat-viem-assertions";
import HardhatDeploy from "hardhat-deploy";

export default defineConfig({
  plugins: [
    hardhatNodeTestRunnerPlugin,
    hardhatKeyStorePlugin,
    hardhatNetworkHelpersPlugin,
    HardhatDeploy,
    hardhatViemPlugin,
    hardhatViemAssertionsPlugin
  ],
  solidity: {
    profiles: {
      default: {
        version: "0.8.28",
      },
      production: {
        version: "0.8.28",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    },
  },
  networks: {
    hardhatMainnet: {
      type: "edr-simulated",
      chainType: "l1",
    },
    hardhatOp: {
      type: "edr-simulated",
      chainType: "op",
    },
    sepolia: {
      type: "http",
      chainType: "l1",
      url: configVariable("SEPOLIA_RPC_URL"),
      accounts: [configVariable("SEPOLIA_PRIVATE_KEY")],
    },
  },
});
