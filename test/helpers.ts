import { resetBuidlerContext } from "@nomiclabs/buidler/plugins-testing";
import { BuidlerRuntimeEnvironment } from "@nomiclabs/buidler/types";

declare module "mocha" {
  interface Context {
    env: BuidlerRuntimeEnvironment;
  }
}

export function useEnvironment(projectPath: string) {
  let previousCWD: string;

  beforeEach("Loading buidler environment", function() {
    previousCWD = process.cwd();
    process.chdir(projectPath);

    this.env = require("@nomiclabs/buidler");
  });

  afterEach("Resetting buidler", function() {
    resetBuidlerContext();
    process.chdir(previousCWD);
  });
}
