import './type-extensions';
import chalk from 'chalk';
import path from 'path';
import {HardhatRuntimeEnvironment, Deployment, HardhatConfig, HardhatUserConfig, EthereumProvider} from 'hardhat/types';
import {extendEnvironment, task, subtask, extendConfig} from 'hardhat/config';
import {HARDHAT_NETWORK_NAME} from 'hardhat/internal/constants';
import * as types from 'hardhat/internal/core/params/argumentTypes';
import {
  TASK_NODE,
  TASK_COMPILE_SOLIDITY_GET_COMPILER_INPUT,
  TASK_TEST,
  TASK_NODE_GET_PROVIDER,
  TASK_NODE_SERVER_READY,
} from 'hardhat/builtin-tasks/task-names';

import debug from 'debug';
const log = debug('hardhat:wighawag:hardhat-deploy');

import {DeploymentsManager} from './DeploymentsManager';
import chokidar from 'chokidar';
import {submitSources} from './etherscan';

export const TASK_DEPLOY = 'deploy';
export const TASK_DEPLOY_MAIN = 'deploy:main';
export const TASK_DEPLOY_RUN_DEPLOY = 'deploy:runDeploy';
export const TASK_EXPORT = 'export';
export const TASK_ETHERSCAN_VERIFY = 'etherscan-verify';

function isHardhatEVM(hre: HardhatRuntimeEnvironment): boolean {
  const {network, hardhatArguments} = hre;
  return !(network.name !== HARDHAT_NETWORK_NAME && hardhatArguments.network !== undefined);
}

function normalizePathArray(config: HardhatConfig, paths: string[]): string[] {
  const newArray: string[] = [];
  for (const value of paths) {
    if (value) {
      newArray.push(normalizePath(config, value, value));
    }
  }
  return newArray;
}

function normalizePath(config: HardhatConfig, userPath: string | undefined, defaultPath: string): string {
  if (userPath === undefined) {
    userPath = path.join(config.paths.root, defaultPath);
  } else {
    if (!path.isAbsolute(userPath)) {
      userPath = path.normalize(path.join(config.paths.root, userPath));
    }
  }
  return userPath;
}

extendConfig((config: HardhatConfig, userConfig: Readonly<HardhatUserConfig>) => {
  config.paths.deployments = normalizePath(config, userConfig.paths?.deployments, 'deployments');

  config.paths.imports = normalizePath(config, userConfig.paths?.imports, 'imports');

  config.paths.deploy = normalizePath(config, userConfig.paths?.deploy, TASK_DEPLOY);

  if (userConfig.namedAccounts) {
    config.namedAccounts = userConfig.namedAccounts;
  } else {
    config.namedAccounts = {};
  }

  if (userConfig.external) {
    if (!config.external) {
      config.external = {};
    }
    if (userConfig.external.artifacts) {
      config.external.artifacts = normalizePathArray(config, userConfig.external.artifacts);
    }
    if (userConfig.external.deployments) {
      config.external.deployments = {};
      for (const key of Object.keys(userConfig.external.deployments)) {
        config.external.deployments[key] = normalizePathArray(config, userConfig.external.deployments[key]);
      }
    }

    if (userConfig.external.deploy) {
      config.external.deploy = normalizePathArray(config, userConfig.external.deploy);
    }
  }
});

log('start...');
let deploymentsManager: DeploymentsManager;
extendEnvironment((env) => {
  let live = true;
  if (env.network.name === 'localhost' || env.network.name === 'hardhat') {
    // the 2 default network are not live network
    live = false;
  }
  if (env.network.config.live !== undefined) {
    live = env.network.config.live;
  }
  env.network.live = live;

  // associate tags to current network as object
  env.network.tags = {};
  const tags = env.network.config.tags || [];
  for (const tag of tags) {
    env.network.tags[tag] = true;
  }

  if (env.network.config.saveDeployments === undefined) {
    env.network.saveDeployments = true;
  } else {
    env.network.saveDeployments = env.network.config.saveDeployments;
  }

  if (deploymentsManager === undefined || env.deployments === undefined) {
    deploymentsManager = new DeploymentsManager(env);
    env.deployments = deploymentsManager.deploymentsExtension;
    env.getNamedAccounts = deploymentsManager.getNamedAccounts.bind(deploymentsManager);
    env.getUnnamedAccounts = deploymentsManager.getUnnamedAccounts.bind(deploymentsManager);
  }
  log('ready');
});

function addIfNotPresent(array: string[], value: string) {
  if (array.indexOf(value) === -1) {
    array.push(value);
  }
}

function setupExtraSolcSettings(settings: {
  metadata: {useLiteralContent: boolean};
  outputSelection: {'*': {'': string[]; '*': string[]}};
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

subtask(TASK_COMPILE_SOLIDITY_GET_COMPILER_INPUT).setAction(async (_, __, runSuper) => {
  const input = await runSuper();
  setupExtraSolcSettings(input.settings);

  return input;
});

subtask(TASK_DEPLOY_RUN_DEPLOY, 'deploy run only')
  .addOptionalParam('export', 'export current network deployments')
  .addOptionalParam('exportAll', 'export all deployments into one file')
  .addOptionalParam('tags', 'dependencies to run')
  .addOptionalParam('write', 'whether to write deployments to file', true, types.boolean)
  .addOptionalParam('pendingtx', 'whether to save pending tx', false, types.boolean)
  .addOptionalParam('gasprice', 'gas price to use for transactions', undefined, types.string)
  .addFlag('reset', 'whether to delete deployments files first')
  .addFlag('log', 'whether to output log')
  .setAction(async (args) => {
    return deploymentsManager.runDeploy(args.tags, {
      log: args.log,
      resetMemory: false,
      deletePreviousDeployments: args.reset,
      writeDeploymentsToFiles: args.write,
      export: args.export,
      exportAll: args.exportAll,
      savePendingTx: args.pendingtx,
      gasPrice: args.gasprice,
    });
  });

subtask(TASK_DEPLOY_MAIN, 'deploy ')
  .addOptionalParam('export', 'export current network deployments')
  .addOptionalParam('exportAll', 'export all deployments into one file')
  .addOptionalParam('tags', 'dependencies to run')
  .addOptionalParam('write', 'whether to write deployments to file', true, types.boolean)
  .addOptionalParam('pendingtx', 'whether to save pending tx', false, types.boolean)
  .addOptionalParam('gasprice', 'gas price to use for transactions', undefined, types.string)
  .addFlag('noCompile', 'disable pre compilation')
  .addFlag('reset', 'whether to delete deployments files first')
  .addFlag('log', 'whether to output log')
  .addFlag('watch', 'redeploy on every change of contract or deploy script')
  .addFlag('watchOnly', 'do not actually deploy, just watch and deploy if changes occurs')
  .setAction(async (args, hre) => {
    async function compileAndDeploy() {
      if (!args.noCompile) {
        await hre.run('compile');
      }
      return hre.run(TASK_DEPLOY_RUN_DEPLOY);
    }

    let currentPromise: Promise<{
      [name: string]: Deployment;
    }> | null = args.watchOnly ? null : compileAndDeploy();
    if (args.watch || args.watchOnly) {
      const watcher = chokidar.watch([hre.config.paths.sources, hre.config.paths.deploy], {
        ignored: /(^|[\/\\])\../, // ignore dotfiles
        persistent: true,
      });

      watcher.on('ready', () => console.log('Initial scan complete. Ready for changes'));

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let rejectPending: any = null;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      function pending(): Promise<any> {
        return new Promise((resolve, reject) => {
          rejectPending = reject;
          if (currentPromise) {
            currentPromise
              .then(() => {
                rejectPending = null;
                resolve();
              })
              .catch((error) => {
                rejectPending = null;
                currentPromise = null;
                console.error(error);
              });
          } else {
            rejectPending = null;
            resolve();
          }
        });
      }
      watcher.on('change', async () => {
        console.log('change detected');
        if (currentPromise) {
          console.log('deployment in progress, please wait ...');
          if (rejectPending) {
            // console.log("disabling previously pending redeployments...");
            rejectPending();
          }
          try {
            // console.log("waiting for current redeployment...");
            await pending();
            // console.log("pending finished");
          } catch (e) {
            return;
          }
        }
        currentPromise = compileAndDeploy();
        try {
          await currentPromise;
        } catch (e) {
          console.error(e);
        }
        currentPromise = null;
      });
      try {
        await currentPromise;
      } catch (e) {
        console.error(e);
      }
      currentPromise = null;
      await new Promise((resolve) => setTimeout(resolve, 2000000000)); // TODO better way ?
    } else {
      const firstDeployments = await currentPromise;
      return firstDeployments;
    }
  });

task(TASK_TEST, 'Runs mocha tests')
  .addFlag('deployFixture', 'run the global fixture before tests')
  .setAction(async (args, hre, runSuper) => {
    if (args.deployFixture || process.env.HARDHAT_DEPLOY_FIXTURE) {
      if (!args.noCompile && !process.env.HARDHAT_DEPLOY_NO_COMPILE) {
        await hre.run('compile');
      }
      await hre.deployments.fixture();
      return runSuper({...args, noCompile: true});
    } else {
      return runSuper(args);
    }
  });

task(TASK_DEPLOY, 'Deploy contracts')
  .addOptionalParam('export', 'export current network deployments')
  .addOptionalParam('exportAll', 'export all deployments into one file')
  .addOptionalParam('tags', 'dependencies to run')
  .addOptionalParam('write', 'whether to write deployments to file', undefined, types.boolean)
  // TODO pendingtx
  .addOptionalParam('gasprice', 'gas price to use for transactions', undefined, types.string)
  .addOptionalParam('deployScripts', 'override deploy script folder path', undefined, types.string)
  .addFlag('noCompile', 'disable pre compilation')
  .addFlag('reset', 'whether to delete deployments files first')
  .addFlag('silent', 'whether to remove log')
  .addFlag('watch', 'redeploy on every change of contract or deploy script')
  .setAction(async (args, hre) => {
    if (args.deployScripts) {
      hre.config.paths.deploy = normalizePath(hre.config, args.deployScripts, args.deployScripts);
    }
    args.log = !args.silent;
    delete args.silent;
    if (args.write === undefined) {
      args.write = !isHardhatEVM(hre);
    }
    args.pendingtx = !isHardhatEVM(hre);
    await hre.run(TASK_DEPLOY_MAIN, args);
  });

task(TASK_EXPORT, 'export contract deployment of the specified network into one file')
  .addOptionalParam('export', 'export current network deployments')
  .addOptionalParam('exportAll', 'export all deployments into one file')
  .setAction(async (args) => {
    await deploymentsManager.loadDeployments(false);
    await deploymentsManager.export(args);
  });

async function enableProviderLogging(provider: EthereumProvider, enabled: boolean) {
  await provider.request({
    method: 'hardhat_setLoggingEnabled',
    params: [enabled],
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let nodeTaskArgs: any;
task(TASK_NODE, 'Starts a JSON-RPC server on top of Hardhat EVM')
  .addOptionalParam('export', 'export current network deployments')
  .addOptionalParam('exportAll', 'export all deployments into one file')
  .addOptionalParam('tags', 'dependencies to run')
  .addOptionalParam('write', 'whether to write deployments to file', true, types.boolean)
  .addOptionalParam('gasprice', 'gas price to use for transactions', undefined, types.string)
  .addFlag('reset', 'whether to delete deployments files first')
  .addFlag('silent', 'whether to renove log')
  .addFlag('noDeploy', 'do not deploy')
  .addFlag('showAccounts', 'display account addresses and private keys')
  .addFlag('watch', 'redeploy on every change of contract or deploy script')
  .setAction(async (args, _, runSuper) => {
    nodeTaskArgs = args;
    console.log('node', args);
    await runSuper(args);
  });

subtask(TASK_NODE_GET_PROVIDER).setAction(
  async (args, hre, runSuper): Promise<EthereumProvider> => {
    const provider = await runSuper(args);
    if (nodeTaskArgs.noDeploy) {
      console.log('skip');
      return provider;
    }
    console.log('enabling logging');
    await enableProviderLogging(provider, false);

    if (isHardhatEVM(hre)) {
      hre.network.name = 'localhost'; // Ensure deployments can be fetched with console
    }
    nodeTaskArgs.watch = false;
    nodeTaskArgs.log = !nodeTaskArgs.silent;
    delete nodeTaskArgs.silent;
    nodeTaskArgs.pendingtx = false;
    await hre.run(TASK_DEPLOY_MAIN, nodeTaskArgs);

    await enableProviderLogging(provider, true);

    return provider;
  }
);

subtask(TASK_NODE_SERVER_READY).setAction(async (args, hre, runSuper) => {
  if (nodeTaskArgs.showAccounts) {
    await runSuper(args);
  } else {
    console.log(chalk.green(`Started HTTP and WebSocket JSON-RPC server at http://${args.address}:${args.port}/`));
    console.log();
  }

  if (nodeTaskArgs.watch) {
    await hre.run(TASK_DEPLOY_MAIN, {...nodeTaskArgs, watchOnly: true});
  }
});

task(TASK_ETHERSCAN_VERIFY, 'submit contract source code to etherscan')
  .addOptionalParam('apiKey', 'etherscan api key', undefined, types.string)
  .addOptionalParam(
    'license',
    'SPDX license (useful if SPDX is not listed in the sources), need to be supported by etherscan: https://etherscan.io/contract-license-types',
    undefined,
    types.string
  )
  .addFlag('forceLicense', 'force the use of the license specified by --license option')
  .addFlag(
    'solcInput',
    'fallback on solc-input (useful when etherscan fails on the minimum sources, see https://github.com/ethereum/solidity/issues/9573)'
  )
  .setAction(async (args, hre) => {
    const etherscanApiKey = args.apiKey || process.env.ETHERSCAN_API_KEY;
    if (!etherscanApiKey) {
      throw new Error(
        `No Etherscan API KEY provided. Set it through comand line option or by setting the "ETHERSCAN_API_KEY" env variable`
      );
    }
    const solcInputsPath = await deploymentsManager.getSolcInputPath();
    await submitSources(hre, solcInputsPath, {
      etherscanApiKey,
      license: args.license,
      fallbackOnSolcInput: args.solcInput,
      forceLicense: args.forceLicense,
    });
  });
