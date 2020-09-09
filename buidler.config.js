const fs = require("fs");
const path = require("path");
const { internalTask, task } = require("@nomiclabs/buidler/config");
const {
  TASK_COMPILE_GET_COMPILER_INPUT,
  TASK_COMPILE
} = require("@nomiclabs/buidler/builtin-tasks/task-names");

function addIfNotPresent(array, value) {
  if (array.indexOf(value) === -1) {
    array.push(value);
  }
}

function setupExtraSolcSettings(settings) {
  settings.metadata = settings.metadata || {};
  settings.metadata.useLiteralContent = true;

  if (settings.outputSelection === undefined) {
    settings.outputSelection = {
      "*": {
        "*": [],
        "": []
      }
    };
  }
  if (settings.outputSelection["*"] === undefined) {
    settings.outputSelection["*"] = {
      "*": [],
      "": []
    };
  }
  if (settings.outputSelection["*"]["*"] === undefined) {
    settings.outputSelection["*"]["*"] = [];
  }
  if (settings.outputSelection["*"][""] === undefined) {
    settings.outputSelection["*"][""] = [];
  }

  addIfNotPresent(settings.outputSelection["*"]["*"], "abi");
  addIfNotPresent(settings.outputSelection["*"]["*"], "evm.bytecode");
  addIfNotPresent(settings.outputSelection["*"]["*"], "evm.deployedBytecode");
  addIfNotPresent(settings.outputSelection["*"]["*"], "metadata");
  addIfNotPresent(settings.outputSelection["*"]["*"], "devdoc");
  addIfNotPresent(settings.outputSelection["*"]["*"], "userdoc");
  addIfNotPresent(settings.outputSelection["*"]["*"], "storageLayout");
  addIfNotPresent(settings.outputSelection["*"]["*"], "evm.methodIdentifiers");
  addIfNotPresent(settings.outputSelection["*"]["*"], "evm.gasEstimates");
  // addIfNotPresent(settings.outputSelection["*"][""], "ir");
  // addIfNotPresent(settings.outputSelection["*"][""], "irOptimized");
  // addIfNotPresent(settings.outputSelection["*"][""], "ast");
}

internalTask(TASK_COMPILE_GET_COMPILER_INPUT).setAction(
  async (_, __, runSuper) => {
    const input = await runSuper();
    setupExtraSolcSettings(input.settings);

    return input;
  }
);

task(TASK_COMPILE).setAction(async (args, __, runSuper) => {
  await runSuper(args);
  const solcOutputString = fs.readFileSync("./cache/solc-output.json");
  const solcOutput = JSON.parse(solcOutputString);

  const artifactFolderpath = "./artifacts";
  const files = fs.readdirSync(artifactFolderpath);
  for (const file of files) {
    const artifactFilepath = path.join(artifactFolderpath, file);
    const artifactString = fs.readFileSync(artifactFilepath);
    const artifact = JSON.parse(artifactString);
    let contractFilepath;
    let contractSolcOutput;
    for (const fileEntry of Object.entries(solcOutput.contracts)) {
      for (const contractEntry of Object.entries(fileEntry[1])) {
        if (contractEntry[0] === artifact.contractName) {
          if (
            artifact.bytecode ===
            "0x" + contractEntry[1].evm.bytecode.object
          ) {
            contractSolcOutput = contractEntry[1];
            contractFilepath = fileEntry[0];
          }
        }
      }
    }
    if (contractSolcOutput) {
      artifact.metadata = contractSolcOutput.metadata;
      artifact.contractFilepath = contractFilepath;
    }
    fs.writeFileSync(artifactFilepath, JSON.stringify(artifact, null, "  "));
  }
});

module.exports = {
  solc: {
    version: "0.7.1",
    optimizer: {
      enabled: true,
      runs: 2000
    }
  },
  paths: {
    sources: "solc_0.7"
  }
};
