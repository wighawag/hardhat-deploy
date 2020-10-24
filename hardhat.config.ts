import {HardhatUserConfig, internalTask} from 'hardhat/config';
import {TASK_COMPILE_SOLIDITY_GET_COMPILER_INPUT} from 'hardhat/builtin-tasks/task-names';

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
      '*': {
        '*': [],
        '': [],
      },
    };
  }
  if (settings.outputSelection['*'] === undefined) {
    settings.outputSelection['*'] = {
      '*': [],
      '': [],
    };
  }
  if (settings.outputSelection['*']['*'] === undefined) {
    settings.outputSelection['*']['*'] = [];
  }
  if (settings.outputSelection['*'][''] === undefined) {
    settings.outputSelection['*'][''] = [];
  }

  addIfNotPresent(settings.outputSelection['*']['*'], 'abi');
  addIfNotPresent(settings.outputSelection['*']['*'], 'evm.bytecode');
  addIfNotPresent(settings.outputSelection['*']['*'], 'evm.deployedBytecode');
  addIfNotPresent(settings.outputSelection['*']['*'], 'metadata');
  addIfNotPresent(settings.outputSelection['*']['*'], 'devdoc');
  addIfNotPresent(settings.outputSelection['*']['*'], 'userdoc');
  addIfNotPresent(settings.outputSelection['*']['*'], 'storageLayout');
  addIfNotPresent(settings.outputSelection['*']['*'], 'evm.methodIdentifiers');
  addIfNotPresent(settings.outputSelection['*']['*'], 'evm.gasEstimates');
  // addIfNotPresent(settings.outputSelection["*"][""], "ir");
  // addIfNotPresent(settings.outputSelection["*"][""], "irOptimized");
  // addIfNotPresent(settings.outputSelection["*"][""], "ast");
}

internalTask(TASK_COMPILE_SOLIDITY_GET_COMPILER_INPUT).setAction(async (_, __, runSuper) => {
  const input = await runSuper();
  setupExtraSolcSettings(input.settings);

  return input;
});

const config: HardhatUserConfig = {
  solidity: {
    version: '0.7.1',
    settings: {
      optimizer: {
        enabled: true,
        runs: 2000,
      },
    },
  },
  paths: {
    sources: 'solc_0.7',
  },
};

export default config;
