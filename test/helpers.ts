import { resetHardhatContext } from "hardhat/plugins-testing";
import { HardhatRuntimeEnvironment } from "hardhat/types";

declare module "mocha" {
  interface Context {
    env: HardhatRuntimeEnvironment;
  }
}

export function useEnvironment(projectPath: string) {
  let previousCWD: string;

  beforeEach("Loading hardhat environment", function() {
    previousCWD = process.cwd();
    process.chdir(projectPath);

    this.env = require("hardhat");
  });

  afterEach("Resetting hardhat", function() {
    resetHardhatContext();
    process.chdir(previousCWD);
  });
}
