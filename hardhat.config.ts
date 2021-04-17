import {HardhatUserConfig, internalTask, task} from 'hardhat/config';
import {
  TASK_COMPILE_SOLIDITY_GET_COMPILER_INPUT,
  TASK_COMPILE,
} from 'hardhat/builtin-tasks/task-names';
import fs from 'fs-extra';
import path from 'path';
import {Artifact, BuildInfo} from 'hardhat/types';
import murmur128 from 'murmur-128';

function addIfNotPresent(array: string[], value: string) {
  if (array.indexOf(value) === -1) {
    array.push(value);
  }
}

function setupExtraSolcSettings(settings: {
  metadata?: {useLiteralContent?: boolean};
  outputSelection: {[key: string]: {[key: string]: string[]}};
}): void {
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

internalTask(TASK_COMPILE_SOLIDITY_GET_COMPILER_INPUT).setAction(
  async (_, __, runSuper) => {
    const input = await runSuper();
    setupExtraSolcSettings(input.settings);

    return input;
  }
);

task(TASK_COMPILE).setAction(async (args, hre, runSuper) => {
  await runSuper(args);
  const extendedArtifactFolderpath = 'extendedArtifacts';
  fs.emptyDirSync(extendedArtifactFolderpath);
  const artifactPaths = await hre.artifacts.getArtifactPaths();
  for (const artifactPath of artifactPaths) {
    const artifact: Artifact = await fs.readJSON(artifactPath);
    const artifactName = path.basename(artifactPath, '.json');
    const artifactDBGPath = path.join(
      path.dirname(artifactPath),
      artifactName + '.dbg.json'
    );
    const artifactDBG = await fs.readJSON(artifactDBGPath);
    const buildinfoPath = path.join(
      path.dirname(artifactDBGPath),
      artifactDBG.buildInfo
    );
    const buildInfo: BuildInfo = await fs.readJSON(buildinfoPath);
    const output =
      buildInfo.output.contracts[artifact.sourceName][artifactName];

    // TODO decide on ExtendedArtifact vs Artifact vs Deployment type
    // save space by not duplicating bytecodes
    if (output.evm?.bytecode?.object) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (output.evm.bytecode.object as any) = undefined;
    }
    if (output.evm?.deployedBytecode?.object) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (output.evm.deployedBytecode.object as any) = undefined;
    }
    // -----------------------------------------

    const solcInput = JSON.stringify(buildInfo.input, null, '  ');
    const solcInputHash = Buffer.from(murmur128(solcInput)).toString('hex');
    const extendedArtifact = {
      ...artifact,
      ...output,
      solcInput,
      solcInputHash,
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (extendedArtifact._format as any) = undefined;
    fs.writeFileSync(
      path.join(extendedArtifactFolderpath, artifactName + '.json'),
      JSON.stringify(extendedArtifact, null, '  ')
    );
  }
});

const config: HardhatUserConfig = {
  solidity: {
    version: '0.7.6',
    settings: {
      optimizer: {
        enabled: true,
        runs: 999999,
      },
    },
  },
  paths: {
    sources: 'solc_0.7',
  },
};

export default config;
