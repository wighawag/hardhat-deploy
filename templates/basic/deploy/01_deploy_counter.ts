import { deployScript, artifacts } from "../rocketh/deploy.js";

export default deployScript(
  async ({ deploy, namedAccounts }) => {
    const { deployer } = namedAccounts;

    await deploy("Counter", {
      account: deployer,
      artifact: artifacts.Counter,
    });
  },
  { tags: ["Counter", "Counter_deploy"] },
);