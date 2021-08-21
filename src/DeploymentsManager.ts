/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  DeployFunction,
  Deployment,
  DeploymentsExtension,
  FixtureFunc,
  DeploymentSubmission,
  Export,
} from '../types';
import {ExtendedArtifact} from '../types';
import {PartialExtension} from './internal/types';

import fs from 'fs-extra';
import path from 'path';

import {BigNumber} from '@ethersproject/bignumber';

import debug from 'debug';
const log = debug('hardhat:wighawag:hardhat-deploy');

import {
  addDeployments,
  processNamedAccounts,
  loadAllDeployments,
  traverseMultipleDirectory,
  deleteDeployments,
  getExtendedArtifactFromFolder,
  getArtifactFromFolder,
  getNetworkName,
  getDeployPaths,
} from './utils';
import {addHelpers, waitForTx} from './helpers';
import {TransactionResponse} from '@ethersproject/providers';
import {Artifact, HardhatRuntimeEnvironment, Network} from 'hardhat/types';
import {store} from './globalStore';

export class DeploymentsManager {
  public deploymentsExtension: DeploymentsExtension;

  private db: {
    accountsLoaded: boolean;
    namedAccounts: {[name: string]: string};
    unnamedAccounts: string[];
    deploymentsLoaded: boolean;
    deployments: Record<string, Deployment>;
    writeDeploymentsToFiles: boolean;
    fixtureCounter: number;
    snapshotCounter: number;
    pastFixtures: {
      [name: string]: {
        index: number;
        data?: any;
        blockHash: string;
        snapshot: any;
        deployments: any;
      };
    };
    logEnabled: boolean;
    pendingTransactions: {[hash: string]: any};
    savePendingTx: boolean;
    gasPrice?: string;
    migrations: {[id: string]: number};
    onlyArtifacts?: string;
    runAsNode: boolean;
  };

  private env: HardhatRuntimeEnvironment;
  private deploymentsPath: string;

  public impersonateUnknownAccounts: boolean;
  public impersonatedAccounts: string[];
  public addressesToProtocol: {[address: string]: string} = {};

  private network: Network;

  private partialExtension: PartialExtension;

  private utils: {
    dealWithPendingTransactions: (
      pendingTxs: {
        [txHash: string]: {
          name: string;
          deployment?: any;
          rawTx: string;
          decoded: {
            from: string;
            gasPrice?: string;
            maxFeePerGas?: string;
            maxPriorityFeePerGas?: string;
            gasLimit: string;
            to: string;
            value: string;
            nonce: number;
            data: string;
            r: string;
            s: string;
            v: number;
            // creates: tx.creates, // TODO test
            chainId: number;
          };
        };
      },
      pendingTxPath: string,
      globalGasPrice: string | undefined
    ) => Promise<void>;
  };

  constructor(env: HardhatRuntimeEnvironment, network: Network) {
    log('constructing DeploymentsManager');

    this.network = network;

    this.impersonateUnknownAccounts = true;
    this.impersonatedAccounts = [];
    this.db = {
      accountsLoaded: false,
      namedAccounts: {},
      unnamedAccounts: [],
      deploymentsLoaded: false,
      deployments: {},
      migrations: {},
      writeDeploymentsToFiles: true, // should default to true ? so we can run scripts that use `deploy` by default
      fixtureCounter: 0,
      snapshotCounter: 0,
      pastFixtures: {},
      logEnabled: process.env['HARDHAT_DEPLOY_LOG'] ? true : false,
      pendingTransactions: {},
      savePendingTx: false,
      gasPrice: undefined,
      runAsNode: false,
    };
    this.env = env;
    this.deploymentsPath = env.config.paths.deployments;

    // TODO
    // this.env.artifacts = new HardhatDeployArtifacts(this.env.artifacts);

    this.partialExtension = {
      save: async (
        name: string,
        deployment: DeploymentSubmission
      ): Promise<boolean> => this.saveDeployment(name, deployment),
      get: async (name: string) => {
        await this.setup(false);
        const deployment = this.db.deployments[name];
        if (deployment === undefined) {
          throw new Error(`No deployment found for: ${name}`);
        }
        return deployment;
      },
      getOrNull: async (name: string) => {
        await this.setup(false);
        return this.db.deployments[name];
      },
      getDeploymentsFromAddress: async (address: string) => {
        const deployments = [];
        for (const deployment of Object.values(this.db.deployments)) {
          if (deployment.address === address) {
            deployments.push(deployment);
          }
        }
        return deployments;
      },
      all: async () => {
        await this.setup(false);
        return this.db.deployments; // TODO copy
      },
      getArtifact: async (contractName: string): Promise<Artifact> => {
        if (this.db.onlyArtifacts) {
          const artifactFromFolder = await getArtifactFromFolder(
            contractName,
            this.db.onlyArtifacts
          );
          if (!artifactFromFolder) {
            throw new Error(
              `cannot find artifact "${contractName}" from folder ${this.db.onlyArtifacts}`
            );
          }
          return artifactFromFolder as Artifact;
        }
        let artifact: Artifact | ExtendedArtifact | undefined =
          await getArtifactFromFolder(
            contractName,
            this.env.config.paths.artifacts
          );
        if (artifact) {
          return artifact as Artifact;
        }
        const importPaths = this.getImportPaths();
        for (const importPath of importPaths) {
          artifact = await getArtifactFromFolder(contractName, importPath);
          if (artifact) {
            return artifact as Artifact;
          }
        }

        if (!artifact) {
          throw new Error(`cannot find artifact "${contractName}"`);
        }
        return artifact;
      },
      getExtendedArtifact: async (
        contractName: string
      ): Promise<ExtendedArtifact> => {
        if (this.db.onlyArtifacts) {
          const artifactFromFolder = await getExtendedArtifactFromFolder(
            contractName,
            this.db.onlyArtifacts
          );
          if (!artifactFromFolder) {
            throw new Error(
              `cannot find artifact "${contractName}" from folder ${this.db.onlyArtifacts}`
            );
          }
          return artifactFromFolder as ExtendedArtifact;
        }
        let artifact: ExtendedArtifact | undefined =
          await getExtendedArtifactFromFolder(
            contractName,
            this.env.config.paths.artifacts
          );
        if (artifact) {
          return artifact;
        }
        const importPaths = this.getImportPaths();
        for (const importPath of importPaths) {
          artifact = await getExtendedArtifactFromFolder(
            contractName,
            importPath
          );
          if (artifact) {
            return artifact;
          }
        }

        if (!artifact) {
          throw new Error(`cannot find artifact "${contractName}"`);
        }
        return artifact;
      },
      run: (
        tags?: string | string[],
        options: {
          resetMemory?: boolean;
          deletePreviousDeployments?: boolean;
          writeDeploymentsToFiles?: boolean;
          export?: string;
          exportAll?: string;
        } = {
          resetMemory: true,
          writeDeploymentsToFiles: false,
          deletePreviousDeployments: false,
        }
      ) => {
        return this.runDeploy(tags, {
          resetMemory:
            options.resetMemory === undefined ? true : options.resetMemory,
          deletePreviousDeployments:
            options.deletePreviousDeployments === undefined
              ? false
              : options.deletePreviousDeployments,
          writeDeploymentsToFiles:
            options.writeDeploymentsToFiles === undefined
              ? false
              : options.writeDeploymentsToFiles,
          export: options.export,
          exportAll: options.exportAll,
          log: false,
          savePendingTx: false,
        });
      },
      fixture: async (
        tags?: string | string[],
        options?: {
          fallbackToGlobal?: boolean;
          keepExistingDeployments?: boolean;
        }
      ) => {
        await this.setup(tags === undefined);
        options = {fallbackToGlobal: true, ...options};
        if (typeof tags === 'string') {
          tags = [tags];
        }
        const globalKey = '::global';
        const globalFixture = this.db.pastFixtures[globalKey];

        let fixtureKey = globalKey;
        if (tags !== undefined) {
          fixtureKey = '::' + tags.join('.');
        }

        if (this.db.pastFixtures[fixtureKey]) {
          const pastFixture = this.db.pastFixtures[fixtureKey];
          const success = await this.revertSnapshot(pastFixture);
          if (success) {
            return this.db.deployments;
          } else {
            delete this.db.pastFixtures[fixtureKey];
          }
        }
        if (globalFixture && options.fallbackToGlobal) {
          const success = await this.revertSnapshot(globalFixture);
          if (success) {
            return this.db.deployments;
          } else {
            delete this.db.pastFixtures[globalKey];
          }
        }
        await this.runDeploy(tags, {
          resetMemory: !options.keepExistingDeployments,
          writeDeploymentsToFiles: false,
          deletePreviousDeployments: false,
          log: false,
          savePendingTx: false,
        });

        await this.saveSnapshot(fixtureKey);
        return this.db.deployments;
      },
      createFixture: <T, O>(func: FixtureFunc<T, O>) => {
        const baseId = '' + ++this.db.fixtureCounter + '::';
        return async (options?: O) => {
          let id = baseId;
          if (options !== undefined) {
            id = id + JSON.stringify(options);
          }
          const saved = this.db.pastFixtures[id];
          if (saved) {
            const success = await this.revertSnapshot(saved);
            if (success) {
              return saved.data;
            }
          }
          const data = await func(this.env, options);
          await this.saveSnapshot(id, data);
          return data;
        };
      },
      log: (...args: any[]) => {
        if (this.db.logEnabled) {
          console.log(...args);
        }
      },
    } as any;

    const print = (msg: string) => {
      if (this.db.logEnabled) {
        process.stdout.write(msg);
      }
    };

    log('adding helpers');
    const helpers = addHelpers(
      this,
      this.partialExtension,
      this.network,
      this.partialExtension.getArtifact,
      async (
        name: string,
        deployment: DeploymentSubmission,
        artifactName?: string
      ): Promise<void> => {
        if (
          artifactName &&
          this.db.writeDeploymentsToFiles &&
          this.network.saveDeployments
        ) {
          // toSave (see deployments.save function)
          const extendedArtifact =
            await this.partialExtension.getExtendedArtifact(artifactName);
          deployment = {
            ...deployment,
            ...extendedArtifact,
          };
        }
        await this.partialExtension.save(name, deployment);
      },
      () => {
        return this.db.writeDeploymentsToFiles && this.network.saveDeployments;
      },
      this.onPendingTx.bind(this),
      async () => {
        // TODO extraGasPrice ?
        if (this.db.gasPrice) {
          return BigNumber.from(this.db.gasPrice);
        } else {
          return undefined;
        }
      },
      this.partialExtension.log,
      print
    );

    this.deploymentsExtension = helpers.extension;
    this.utils = helpers.utils;
  }

  private networkWasSetup = false;
  public setupNetwork(): void {
    if (this.networkWasSetup) {
      return;
    }
    // reassign network variables based on fork name if any;
    const networkName = this.getNetworkName();
    if (networkName !== this.network.name) {
      const networkObject = store.networks[networkName];
      if (networkObject) {
        this.env.network.live = networkObject.live;
        this.env.network.tags = networkObject.tags;
        this.env.network.deploy = networkObject.deploy;
      }
    }
    this.networkWasSetup = true;
  }

  private _chainId: string | undefined;
  public async getChainId(): Promise<string> {
    if (this._chainId) {
      return this._chainId;
    }
    this.setupNetwork();
    try {
      this._chainId = await this.network.provider.send('eth_chainId');
    } catch (e) {
      console.log('failed to get chainId, falling back on net_version...');
      this._chainId = await this.network.provider.send('net_version');
    }

    if (!this._chainId) {
      throw new Error(`could not get chainId from network`);
    }

    if (this._chainId.startsWith('0x')) {
      this._chainId = BigNumber.from(this._chainId).toString();
    }

    return this._chainId;
  }

  public runAsNode(enabled: boolean): void {
    this.db.runAsNode = enabled;
  }

  public async dealWithPendingTransactions(): Promise<void> {
    let pendingTxs: {
      [txHash: string]: {
        name: string;
        deployment?: any;
        rawTx: string;
        decoded: {
          from: string;
          gasPrice?: string;
          maxFeePerGas?: string;
          maxPriorityFeePerGas?: string;
          gasLimit: string;
          to: string;
          value: string;
          nonce: number;
          data: string;
          r: string;
          s: string;
          v: number;
          // creates: tx.creates, // TODO test
          chainId: number;
        };
      };
    } = {};
    const pendingTxPath = path.join(
      this.deploymentsPath,
      this.deploymentFolder(),
      '.pendingTransactions'
    );
    try {
      pendingTxs = JSON.parse(fs.readFileSync(pendingTxPath).toString());
    } catch (e) {}
    await this.utils.dealWithPendingTransactions(
      pendingTxs,
      pendingTxPath,
      this.db.gasPrice
    );
  }

  // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
  public async onPendingTx(
    tx: TransactionResponse,
    name?: string,
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
    deployment?: any
  ): Promise<TransactionResponse> {
    if (
      this.db.writeDeploymentsToFiles &&
      this.network.saveDeployments &&
      this.db.savePendingTx
    ) {
      const deployFolderPath = path.join(
        this.deploymentsPath,
        this.deploymentFolder()
      );
      // console.log("tx", tx.hash);
      const pendingTxPath = path.join(deployFolderPath, '.pendingTransactions');
      fs.ensureDirSync(deployFolderPath);
      const rawTx = tx.raw;
      const decoded = tx.raw
        ? undefined
        : {
            from: tx.from,
            gasPrice: tx.gasPrice?.toString(),
            maxFeePerGas: tx.maxFeePerGas?.toString(),
            maxPriorityFeePerGas: tx.maxPriorityFeePerGas?.toString(),
            gasLimit: tx.gasLimit.toString(),
            to: tx.to,
            value: tx.value.toString(),
            nonce: tx.nonce,
            data: tx.data,
            r: tx.r,
            s: tx.s,
            v: tx.v,
            // creates: tx.creates, // TODO test
            chainId: tx.chainId,
          };
      this.db.pendingTransactions[tx.hash] = name
        ? {name, deployment, rawTx, decoded}
        : {rawTx, decoded};
      fs.writeFileSync(
        pendingTxPath,
        JSON.stringify(this.db.pendingTransactions, null, '  ')
      );
      // await new Promise(r => setTimeout(r, 20000));
      const wait = tx.wait.bind(tx);
      tx.wait = async () => {
        const receipt = await wait();
        // console.log("checking pending tx...");
        delete this.db.pendingTransactions[tx.hash];
        if (Object.keys(this.db.pendingTransactions).length === 0) {
          fs.removeSync(pendingTxPath);
        } else {
          fs.writeFileSync(
            pendingTxPath,
            JSON.stringify(this.db.pendingTransactions, null, '  ')
          );
        }
        return receipt;
      };
    }
    return tx;
  }

  public async getNamedAccounts(): Promise<{[name: string]: string}> {
    await this.setupAccounts();
    return this.db.namedAccounts;
  }

  public async getUnnamedAccounts(): Promise<string[]> {
    await this.setupAccounts();
    return this.db.unnamedAccounts;
  }

  public async loadDeployments(
    chainIdExpected = true
  ): Promise<{[name: string]: Deployment}> {
    let chainId: string | undefined;
    if (chainIdExpected) {
      chainId = await this.getChainId();
    }

    let migrations = {};
    try {
      log('loading migrations');
      migrations = JSON.parse(
        fs
          .readFileSync(
            path.join(
              this.deploymentsPath,
              this.deploymentFolder(),
              '.migrations.json'
            )
          )
          .toString()
      );
    } catch (e) {}
    this.db.migrations = migrations;
    // console.log({ migrations: this.db.migrations });

    const networkName = this.getDeploymentNetworkName();

    addDeployments(
      this.db,
      this.deploymentsPath,
      this.deploymentFolder(),
      networkName === this.network.name ? chainId : undefined // fork mode, we do not care about chainId ?
    );

    const extraDeploymentPaths =
      this.env.config.external &&
      this.env.config.external.deployments &&
      this.env.config.external.deployments[networkName];
    if (extraDeploymentPaths) {
      for (const deploymentFolderPath of extraDeploymentPaths) {
        addDeployments(this.db, deploymentFolderPath, '', undefined, chainId);
      }
    }

    this.db.deploymentsLoaded = true;
    return this.db.deployments;
  }

  public async deletePreviousDeployments(folderPath?: string): Promise<void> {
    folderPath = folderPath || this.deploymentFolder();
    deleteDeployments(this.deploymentsPath, folderPath);
  }

  public getSolcInputPath(): string {
    return path.join(
      this.deploymentsPath,
      this.deploymentFolder(),
      'solcInputs'
    );
  }

  public async saveDeployment(
    name: string,
    deployment: DeploymentSubmission
  ): Promise<boolean> {
    if (
      typeof deployment.address === undefined &&
      !deployment.receipt?.contractAddress
    ) {
      throw new Error(
        'deployment need a receipt with contractAddress or an address'
      );
    }
    if (typeof deployment.abi === undefined) {
      throw new Error('deployment need an ABI');
    }
    if (name.includes('/') || name.includes(':')) {
      throw new Error(
        `deployment name must not be a path or Fully Qualified Name - for such purposes consider using the "contract" field of deployment options`
      );
    }

    const chainId = await this.getChainId();

    const toSave =
      this.db.writeDeploymentsToFiles && this.network.saveDeployments;

    const filepath = path.join(
      this.deploymentsPath,
      this.deploymentFolder(),
      name + '.json'
    );

    // handle ethers receipt :
    const receipt = deployment.receipt;
    const actualReceipt = receipt
      ? {
          to: receipt.to,
          from: receipt.from,
          contractAddress: receipt.contractAddress,
          transactionIndex: receipt.transactionIndex,
          gasUsed:
            receipt.gasUsed && (receipt.gasUsed as BigNumber)._isBigNumber
              ? receipt.gasUsed.toString()
              : receipt.gasUsed,
          logsBloom: receipt.logsBloom,
          blockHash: receipt.blockHash,
          transactionHash: receipt.transactionHash,
          logs: receipt.logs,
          events: receipt.events,
          blockNumber: receipt.blockNumber,
          cumulativeGasUsed:
            receipt.cumulativeGasUsed &&
            (receipt.cumulativeGasUsed as BigNumber)._isBigNumber
              ? receipt.cumulativeGasUsed.toString()
              : receipt.cumulativeGasUsed,
          status: receipt.status,
          byzantium: receipt.byzantium,
        }
      : undefined;

    // from : https://stackoverflow.com/a/14810722/1663971
    function objectMap(object: any, mapFn: (obj: any) => any) {
      return Object.keys(object).reduce(function (result: any, key) {
        result[key] = mapFn(object[key]);
        return result;
      }, {});
    }

    // TODO can cause infinite loop
    function transform(v: any): any {
      if (v._isBigNumber) {
        return v.toString();
      }
      if (Array.isArray(v)) {
        return v.map(transform);
      }
      if (typeof v === 'object') {
        return objectMap(v, transform);
      }
      return v;
    }

    const actualArgs = deployment.args?.map(transform);

    const obj = JSON.parse(
      JSON.stringify({
        address: deployment.address || actualReceipt?.contractAddress,
        abi: deployment.abi,
        transactionHash:
          deployment.transactionHash || actualReceipt?.transactionHash,
        receipt: actualReceipt,
        args: actualArgs,
        linkedData: deployment.linkedData,
        solcInputHash: deployment.solcInputHash,
        metadata: deployment.metadata,
        bytecode: deployment.bytecode,
        deployedBytecode: deployment.deployedBytecode,
        libraries: deployment.libraries,
        facets: deployment.facets,
        diamondCut: deployment.diamondCut,
        execute: deployment.execute,
        history: deployment.history,
        implementation: deployment.implementation,
        devdoc: deployment.devdoc,
        userdoc: deployment.userdoc,
        storageLayout: deployment.storageLayout,
        methodIdentifiers: deployment.methodIdentifiers,
        gasEstimates: deployment.gasEstimates, // TODO double check : use evm field ?
      })
    );
    this.db.deployments[name] = obj;
    if (obj.address === undefined && obj.transactionHash !== undefined) {
      let receiptFetched;
      try {
        receiptFetched = await waitForTx(
          this.network.provider,
          obj.transactionHash,
          true
        );
        // TODO add receipt ?
        obj.address = receiptFetched.contractAddress;
        if (!obj.address) {
          throw new Error('no contractAddress in receipt');
        }
      } catch (e) {
        console.error(e);
        if (toSave) {
          console.log('deleting ' + filepath);
          fs.unlinkSync(filepath);
        }
        delete this.db.deployments[name];
        return false; // TODO throw error ?
      }
    }

    this.db.deployments[name] = obj;
    // console.log({chainId, typeOfChainId: typeof chainId});
    if (toSave) {
      // console.log("writing " + filepath); // TODO remove
      try {
        fs.mkdirSync(this.deploymentsPath);
      } catch (e) {}
      const deployFolderpath = path.join(
        this.deploymentsPath,
        this.deploymentFolder()
      );
      try {
        fs.mkdirSync(deployFolderpath);
      } catch (e) {}
      const chainIdFilepath = path.join(deployFolderpath, '.chainId');
      if (!fs.existsSync(chainIdFilepath)) {
        fs.writeFileSync(chainIdFilepath, chainId);
      }

      fs.writeFileSync(filepath, JSON.stringify(obj, null, '  '));

      if (deployment.solcInputHash && deployment.solcInput) {
        const solcInputsFolderpath = path.join(
          this.deploymentsPath,
          this.deploymentFolder(),
          'solcInputs'
        );
        const solcInputFilepath = path.join(
          solcInputsFolderpath,
          deployment.solcInputHash + '.json'
        );
        if (!fs.existsSync(solcInputFilepath)) {
          try {
            fs.mkdirSync(solcInputsFolderpath);
          } catch (e) {}
          fs.writeFileSync(solcInputFilepath, deployment.solcInput);
        }
      }
    }

    // this.spreadEvents();

    return true;
  }

  private companionManagers: {[name: string]: DeploymentsManager} = {};
  public addCompanionManager(
    name: string,
    networkDeploymentsManager: DeploymentsManager
  ): void {
    this.companionManagers[name] = networkDeploymentsManager;
  }

  public async runDeploy(
    tags?: string | string[],
    options: {
      deletePreviousDeployments: boolean;
      log: boolean;
      resetMemory: boolean;
      writeDeploymentsToFiles: boolean;
      savePendingTx: boolean;
      export?: string;
      exportAll?: string;
      gasPrice?: string;
    } = {
      log: false,
      resetMemory: true,
      deletePreviousDeployments: false,
      writeDeploymentsToFiles: true,
      savePendingTx: false,
    }
  ): Promise<{[name: string]: Deployment}> {
    log('runDeploy');
    this.setupNetwork();
    if (options.deletePreviousDeployments) {
      log('deleting previous deployments');
      this.db.deployments = {};
      this.db.migrations = {};
      await this.deletePreviousDeployments();
      for (const companionNetworkName of Object.keys(this.companionManagers)) {
        const companionManager = this.companionManagers[companionNetworkName];
        companionManager.deletePreviousDeployments();
      }
    }

    await this.loadDeployments();
    this.db.writeDeploymentsToFiles = options.writeDeploymentsToFiles;
    this.db.savePendingTx = options.savePendingTx;
    this.db.logEnabled = options.log;
    this.db.gasPrice = options.gasPrice;
    if (options.resetMemory) {
      log('reseting memory');
      this.db.deployments = {};
      this.db.migrations = {};
    }
    if (!options.deletePreviousDeployments && options.savePendingTx) {
      await this.dealWithPendingTransactions(); // TODO deal with reset ?
    }

    for (const companionNetworkName of Object.keys(this.companionManagers)) {
      const companionManager = this.companionManagers[companionNetworkName];
      await companionManager.loadDeployments();
      companionManager.db.writeDeploymentsToFiles =
        options.writeDeploymentsToFiles;
      companionManager.db.savePendingTx = options.savePendingTx;
      companionManager.db.logEnabled = options.log;
      // companionManager.db.gasPrice = options.gasPrice;
      if (options.resetMemory) {
        log('reseting memory');
        companionManager.db.deployments = {};
        companionManager.db.migrations = {};
      }
      if (!options.deletePreviousDeployments && options.savePendingTx) {
        await companionManager.dealWithPendingTransactions(); // TODO deal with reset ?
      }
    }

    if (tags !== undefined && typeof tags === 'string') {
      tags = [tags];
    }

    if (this.env.config.external?.contracts) {
      for (const externalContracts of this.env.config.external.contracts) {
        if (externalContracts.deploy) {
          this.db.onlyArtifacts = externalContracts.artifacts;
          try {
            await this.executeDeployScripts([externalContracts.deploy], tags);
          } finally {
            this.db.onlyArtifacts = undefined;
          }
        }
      }
    }

    const deployPaths = getDeployPaths(this.network);

    await this.executeDeployScripts(deployPaths, tags);

    await this.export(options);

    return this.db.deployments;
  }

  public async executeDeployScripts(
    deployScriptsPaths: string[],
    tags?: string[]
  ): Promise<void> {
    const wasWrittingToFiles = this.db.writeDeploymentsToFiles;
    // TODO loop over companion networks ?
    // This is currently posing problem for network like optimism which require a different set of artifact and hardhat currently only expose one set at a time

    let filepaths;
    try {
      filepaths = traverseMultipleDirectory(deployScriptsPaths);
    } catch (e) {
      return;
    }
    filepaths = filepaths.sort((a: string, b: string) => {
      if (a < b) {
        return -1;
      }
      if (a > b) {
        return 1;
      }
      return 0;
    });
    log('deploy script folder parsed');

    const funcByFilePath: {[filename: string]: DeployFunction} = {};
    const scriptPathBags: {[tag: string]: string[]} = {};
    const scriptFilePaths: string[] = [];
    for (const filepath of filepaths) {
      const scriptFilePath = path.resolve(filepath);
      let deployFunc: DeployFunction;
      // console.log("fetching " + scriptFilePath);
      try {
        delete require.cache[scriptFilePath]; // ensure we reload it every time, so changes are taken in consideration
        deployFunc = require(scriptFilePath);
        if ((deployFunc as any).default) {
          deployFunc = (deployFunc as any).default as DeployFunction;
        }
        funcByFilePath[scriptFilePath] = deployFunc;
      } catch (e) {
        // console.error("require failed", e);
        throw new Error(
          'ERROR processing skip func of ' + filepath + ':\n' + (e.stack || e)
        );
      }
      // console.log("get tags if any for " + scriptFilePath);
      let scriptTags = deployFunc.tags;
      if (scriptTags !== undefined) {
        if (typeof scriptTags === 'string') {
          scriptTags = [scriptTags];
        }
        for (const tag of scriptTags) {
          if (tag.indexOf(',') >= 0) {
            throw new Error('Tag cannot contains commas');
          }
          const bag = scriptPathBags[tag] || [];
          scriptPathBags[tag] = bag;
          bag.push(scriptFilePath);
        }
      }
      // console.log("tags found " + scriptFilePath, scriptTags);
      if (tags !== undefined) {
        let found = false;
        if (scriptTags !== undefined) {
          for (const tagToFind of tags) {
            for (const tag of scriptTags) {
              if (tag === tagToFind) {
                scriptFilePaths.push(scriptFilePath);
                found = true;
                break;
              }
            }
            if (found) {
              break;
            }
          }
        }
      } else {
        scriptFilePaths.push(scriptFilePath);
      }
    }
    log('tag collected');

    // console.log({ scriptFilePaths });
    const scriptsRegisteredToRun: {[filename: string]: boolean} = {};
    const scriptsToRun: Array<{
      func: DeployFunction;
      filePath: string;
    }> = [];
    const scriptsToRunAtTheEnd: Array<{
      func: DeployFunction;
      filePath: string;
    }> = [];
    function recurseDependencies(scriptFilePath: string) {
      if (scriptsRegisteredToRun[scriptFilePath]) {
        return;
      }
      const deployFunc = funcByFilePath[scriptFilePath];
      if (deployFunc.dependencies) {
        for (const dependency of deployFunc.dependencies) {
          const scriptFilePathsToAdd = scriptPathBags[dependency];
          if (scriptFilePathsToAdd) {
            for (const scriptFilenameToAdd of scriptFilePathsToAdd) {
              recurseDependencies(scriptFilenameToAdd);
            }
          }
        }
      }
      if (!scriptsRegisteredToRun[scriptFilePath]) {
        if (deployFunc.runAtTheEnd) {
          scriptsToRunAtTheEnd.push({
            filePath: scriptFilePath,
            func: deployFunc,
          });
        } else {
          scriptsToRun.push({
            filePath: scriptFilePath,
            func: deployFunc,
          });
        }
        scriptsRegisteredToRun[scriptFilePath] = true;
      }
    }
    for (const scriptFilePath of scriptFilePaths) {
      recurseDependencies(scriptFilePath);
    }
    log('dependencies collected');

    try {
      for (const deployScript of scriptsToRun.concat(scriptsToRunAtTheEnd)) {
        const filename = path.basename(deployScript.filePath);
        if (deployScript.func.id && this.db.migrations[deployScript.func.id]) {
          log(
            `skipping ${filename} as migrations already executed and complete`
          );
          continue;
        }
        let skip = false;
        if (deployScript.func.skip) {
          log(`should we skip  ${deployScript.filePath} ?`);
          try {
            skip = await deployScript.func.skip(this.env);
          } catch (e) {
            // console.error("skip failed", e);
            throw new Error(
              'ERROR processing skip func of ' +
                deployScript.filePath +
                ':\n' +
                (e.stack || e)
            );
          }
          log(`checking skip for ${deployScript.filePath} complete`);
        }
        if (!skip) {
          log(`executing  ${deployScript.filePath}`);
          let result;
          try {
            result = await deployScript.func(this.env);
          } catch (e) {
            // console.error("execution failed", e);
            throw new Error(
              'ERROR processing ' +
                deployScript.filePath +
                ':\n' +
                (e.stack || e)
            );
          }
          log(`executing ${deployScript.filePath} complete`);
          if (result && typeof result === 'boolean') {
            if (!deployScript.func.id) {
              throw new Error(
                `${deployScript.filePath} return true to not be eecuted again, but does not provide an id. the script function need to have the field "id" to be set`
              );
            }
            this.db.migrations[deployScript.func.id] = Math.floor(
              Date.now() / 1000
            );

            const deploymentFolderPath = this.deploymentFolder();

            // TODO refactor to extract this whole path and folder existence stuff
            const toSave =
              this.db.writeDeploymentsToFiles && this.network.saveDeployments;
            if (toSave) {
              try {
                fs.mkdirSync(this.deploymentsPath);
              } catch (e) {}
              try {
                fs.mkdirSync(
                  path.join(this.deploymentsPath, deploymentFolderPath)
                );
              } catch (e) {}
              fs.writeFileSync(
                path.join(
                  this.deploymentsPath,
                  deploymentFolderPath,
                  '.migrations.json'
                ),
                JSON.stringify(this.db.migrations, null, '  ')
              );
            }
          }
        }
      }
    } catch (e) {
      this.db.writeDeploymentsToFiles = wasWrittingToFiles;
      throw e;
    }
    this.db.writeDeploymentsToFiles = wasWrittingToFiles;
    log('deploy scripts complete');
  }

  public async export(options: {
    exportAll?: string;
    export?: string;
  }): Promise<void> {
    let chainId: string | undefined;
    try {
      chainId = fs
        .readFileSync(
          path.join(this.deploymentsPath, this.deploymentFolder(), '.chainId')
        )
        .toString();
    } catch (e) {}
    if (!chainId) {
      chainId = await this.getChainId();
    }

    if (options.exportAll !== undefined) {
      log('load all deployments for export-all');
      const all = loadAllDeployments(
        this.env,
        this.deploymentsPath,
        true,
        this.env.config.external && this.env.config.external.deployments
      );
      const currentNetworkDeployments: {
        [contractName: string]: {
          address: string;
          abi: any[];
          linkedData?: any;
        };
      } = {};
      const currentDeployments = this.db.deployments;
      for (const contractName of Object.keys(currentDeployments)) {
        const deployment = currentDeployments[contractName];
        currentNetworkDeployments[contractName] = {
          address: deployment.address,
          abi: deployment.abi,
          linkedData: deployment.linkedData,
        };
      }
      if (all[chainId] === undefined) {
        all[chainId] = {};
      } else {
        // Ensure no past deployments are recorded
        delete all[chainId][this.getDeploymentNetworkName()];
      }
      all[chainId][this.getDeploymentNetworkName()] = {
        name: this.getDeploymentNetworkName(),
        chainId,
        contracts: currentNetworkDeployments,
      };
      fs.writeFileSync(options.exportAll, JSON.stringify(all, null, '  ')); // TODO remove bytecode ?
      log('export-all complete');
    }

    if (options.export !== undefined) {
      log('single export...');
      const currentNetworkDeployments: {
        [contractName: string]: {
          address: string;
          abi: any[];
          linkedData?: any;
        };
      } = {};
      if (chainId !== undefined) {
        const currentDeployments = this.db.deployments;
        for (const contractName of Object.keys(currentDeployments)) {
          const deployment = currentDeployments[contractName];
          currentNetworkDeployments[contractName] = {
            address: deployment.address,
            abi: deployment.abi,
            linkedData: deployment.linkedData,
          };
        }
      } else {
        throw new Error('chainId is undefined');
      }
      const singleExport: Export = {
        name: this.getDeploymentNetworkName(),
        chainId,
        contracts: currentNetworkDeployments,
      };
      fs.writeFileSync(
        options.export,
        JSON.stringify(singleExport, null, '  ')
      ); // TODO remove bytecode ?
      log('single export complete');
    }
  }

  private getImportPaths() {
    const importPaths = [this.env.config.paths.imports];
    if (this.env.config.external && this.env.config.external.contracts) {
      for (const externalContracts of this.env.config.external.contracts) {
        importPaths.push(externalContracts.artifacts);
      }
    }
    return importPaths;
  }

  private async setup(isRunningGlobalFixture: boolean) {
    this.setupNetwork();
    if (!this.db.deploymentsLoaded && !isRunningGlobalFixture) {
      if (process.env.HARDHAT_DEPLOY_FIXTURE) {
        if (process.env.HARDHAT_COMPILE) {
          // console.log("compiling...");
          await this.env.run('compile');
        }
        this.db.deploymentsLoaded = true;
        // console.log("running global fixture....");
        await this.partialExtension.fixture(undefined, {
          keepExistingDeployments: true, // by default reuse the existing deployments (useful for fork testing)
        });
      } else {
        if (process.env.HARDHAT_COMPILE) {
          // console.log("compiling...");
          await this.env.run('compile');
        }
        await this.loadDeployments();
      }
    }
  }

  private async saveSnapshot(key: string, data?: any) {
    const latestBlock = await this.network.provider.send(
      'eth_getBlockByNumber',
      ['latest', false]
    );
    const snapshot = await this.network.provider.send('evm_snapshot', []);
    this.db.pastFixtures[key] = {
      index: ++this.db.snapshotCounter,
      snapshot,
      data,
      blockHash: latestBlock.hash,
      deployments: {...this.db.deployments},
    };
  }

  private async revertSnapshot(saved: {
    index: number;
    snapshot: any;
    blockHash: string;
    deployments: any;
  }): Promise<boolean> {
    const snapshotToRevertIndex = saved.index;
    for (const fixtureKey of Object.keys(this.db.pastFixtures)) {
      const snapshotIndex = this.db.pastFixtures[fixtureKey].index;
      if (snapshotIndex > snapshotToRevertIndex) {
        delete this.db.pastFixtures[fixtureKey];
      }
    }
    const success = await this.network.provider.send('evm_revert', [
      saved.snapshot,
    ]);
    if (success) {
      const blockRetrieved = await this.network.provider.send(
        'eth_getBlockByHash',
        [saved.blockHash, false]
      );
      if (blockRetrieved) {
        saved.snapshot = await this.network.provider.send('evm_snapshot', []); // it is necessary to re-snapshot it
        this.db.deployments = {...saved.deployments};
      } else {
        // TODO or should we throw ?
        return false;
      }
    }
    return success;
  }

  disableAutomaticImpersonation(): void {
    this.impersonateUnknownAccounts = false;
  }

  private getNetworkName(): string {
    return getNetworkName(this.network);
  }

  private getDeploymentNetworkName(): string {
    if (this.db.runAsNode) {
      return 'localhost';
    }
    return getNetworkName(this.network);
  }

  private deploymentFolder(): string {
    return this.getDeploymentNetworkName();
  }

  private async setupAccounts(): Promise<{
    namedAccounts: {[name: string]: string};
    unnamedAccounts: string[];
  }> {
    if (!this.db.accountsLoaded) {
      const chainId = await this.getChainId();
      const accounts = await this.network.provider.send('eth_accounts');
      const {
        namedAccounts,
        unnamedAccounts,
        unknownAccounts,
        addressesToProtocol,
      } = processNamedAccounts(
        this.network,
        this.env.config.namedAccounts,
        accounts,
        chainId
      ); // TODO pass in network name
      if (
        this.network.name === 'hardhat' &&
        this.impersonateUnknownAccounts &&
        !process.env.HARDHAT_DEPLOY_NO_IMPERSONATION
      ) {
        for (const address of unknownAccounts) {
          await this.network.provider.request({
            method: 'hardhat_impersonateAccount',
            params: [address],
          });
          this.impersonatedAccounts.push(address);
        }
      }
      this.db.namedAccounts = namedAccounts;
      this.db.unnamedAccounts = unnamedAccounts;
      this.db.accountsLoaded = true;
      this.addressesToProtocol = addressesToProtocol;
    }

    return {
      namedAccounts: this.db.namedAccounts,
      unnamedAccounts: this.db.unnamedAccounts,
    };
  }
}
