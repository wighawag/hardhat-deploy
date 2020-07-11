import { readArtifactSync, readArtifact } from "@nomiclabs/buidler/plugins";
import {
  BuidlerRuntimeEnvironment,
  DeployFunction,
  Deployment,
  DeploymentsExtension,
  FixtureFunc,
  DeploymentSubmission,
  Export,
  MultiExport
} from "@nomiclabs/buidler/types";
import { PartialExtension } from "./types";

import fs from "fs-extra";
import path from "path";

import { BigNumber } from "@ethersproject/bignumber";
import { parse as parseTransaction } from "@ethersproject/transactions";

import debug from "debug";
const log = debug("buidler:wighawag:buidler-deploy");

import {
  addDeployments,
  processNamedAccounts,
  getChainId,
  loadAllDeployments,
  traverse,
  nameToChainId,
  deleteDeployments
} from "./utils";
import { addHelpers, waitForTx } from "./helpers";
import {
  TransactionResponse,
  TransactionRequest
} from "@ethersproject/providers";

export class DeploymentsManager {
  public deploymentsExtension: DeploymentsExtension;

  private db: {
    accountsLoaded: boolean;
    namedAccounts: { [name: string]: string };
    deploymentsLoaded: boolean;
    deployments: any;
    writeDeploymentsToFiles: boolean;
    fixtureCounter: number;
    snapshotCounter: number;
    pastFixtures: {
      [name: string]: {
        index: number;
        data?: any;
        snapshot: any;
        deployments: any;
      };
    };
    logEnabled: boolean;
    pendingTransactions: { [hash: string]: any };
    savePendingTx: boolean;
    gasPrice?: string;
    migrations: { [filename: string]: number };
  };

  private env: BuidlerRuntimeEnvironment;
  private deploymentsPath: string;

  constructor(env: BuidlerRuntimeEnvironment) {
    log("constructing DeploymentsManager");
    this.db = {
      accountsLoaded: false,
      namedAccounts: {},
      deploymentsLoaded: false,
      deployments: {},
      migrations: {},
      writeDeploymentsToFiles: false,
      fixtureCounter: 0,
      snapshotCounter: 0,
      pastFixtures: {},
      logEnabled: false,
      pendingTransactions: {},
      savePendingTx: false,
      gasPrice: undefined
    };
    this.env = env;
    this.deploymentsPath =
      env.config.paths.deployments ||
      path.join(env.config.paths.root, "/deployments");

    this.env.getChainId = () => {
      return getChainId(this.env);
    };

    const partialExtension: PartialExtension = {
      save: async (name: string, deployment: Deployment): Promise<boolean> =>
        this.saveDeployment(name, deployment),
      get: async (name: string) => {
        if (!this.db.deploymentsLoaded) {
          await this.loadDeployments();
        }
        const deployment = this.db.deployments[name];
        if (deployment === undefined) {
          throw new Error(`No deployment found for: ${name}`);
        }
        return deployment;
      },
      getOrNull: async (name: string) => {
        if (!this.db.deploymentsLoaded) {
          await this.loadDeployments();
        }
        return this.db.deployments[name];
      },
      all: async () => {
        return this.db.deployments; // TODO copy
      },
      getArtifact: async (contractName: string): Promise<any> => {
        let artifact;
        try {
          artifact = await readArtifact(
            this.env.config.paths.artifacts,
            contractName
          );
        } catch (e) {
          try {
            artifact = await readArtifact(
              this.env.config.paths.imports ||
                path.join(this.env.config.paths.root, "imports"),
              contractName
            );
          } catch (ee) {
            throw e;
          }
        }
        return artifact;
      },
      getArtifactSync: (contractName: string): any => {
        let artifact;
        try {
          artifact = readArtifactSync(
            this.env.config.paths.artifacts,
            contractName
          );
        } catch (e) {
          try {
            artifact = readArtifactSync(
              this.env.config.paths.imports ||
                path.join(this.env.config.paths.root, "imports"),
              contractName
            );
          } catch (ee) {
            throw e;
          }
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
          deletePreviousDeployments: false
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
          savePendingTx: false
        });
      },
      fixture: async (tags?: string | string[]) => {
        if (typeof tags === "string") {
          tags = [tags];
        }
        const globalKey = "::global";
        let fixtureKey;
        if (tags !== undefined) {
          fixtureKey = "::" + tags.join(".");
        }

        const global = this.db.pastFixtures[globalKey];
        if (global) {
          await this.revertSnapshot(globalKey, global);
          return this.db.deployments;
        } else if (
          tags !== undefined &&
          fixtureKey !== undefined &&
          this.db.pastFixtures[fixtureKey]
        ) {
          const pastFixture = this.db.pastFixtures[fixtureKey];
          await this.revertSnapshot(fixtureKey, pastFixture);
          return this.db.deployments;
        }
        await this.runDeploy(tags, {
          resetMemory: true,
          writeDeploymentsToFiles: false,
          deletePreviousDeployments: false,
          log: false,
          savePendingTx: false
        });

        if (fixtureKey !== undefined) {
          await this.saveSnapshot(fixtureKey);
        } else {
          await this.saveSnapshot(globalKey);
        }
        return this.db.deployments;
      },
      createFixture: (func: FixtureFunc) => {
        const baseId = "" + ++this.db.fixtureCounter + "::";
        return async (options?: any) => {
          let id = baseId;
          if (options !== undefined) {
            id = id + JSON.stringify(options);
          }
          const saved = this.db.pastFixtures[id];
          if (saved) {
            await this.revertSnapshot(id, saved);
            return saved.data;
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
      }
    } as any;

    log("adding helpers");
    this.deploymentsExtension = addHelpers(
      env,
      partialExtension,
      partialExtension.getArtifact,
      this.onPendingTx.bind(this),
      async () => {
        // TODO extraGasPrice ?
        if (this.db.gasPrice) {
          return BigNumber.from(this.db.gasPrice);
        } else {
          return undefined;
        }
      },
      partialExtension.log
    );
  }

  public async dealWithPendingTransactions() {
    let pendingTxs: {
      [txHash: string]: {
        name: string;
        deployment?: any;
        rawTx: string;
      };
    } = {};
    const chainId = await getChainId(this.env);
    const pendingTxPath = path.join(
      this.deploymentsPath,
      this.getDeploymentsSubPath(chainId),
      ".pendingTransactions"
    );
    try {
      pendingTxs = JSON.parse(fs.readFileSync(pendingTxPath).toString());
    } catch (e) {}
    const txHashes = Object.keys(pendingTxs);
    for (const txHash of txHashes) {
      const txData = pendingTxs[txHash];
      if (txData.rawTx) {
        const tx = parseTransaction(txData.rawTx); // TODO fix
        // if (this.db.gasPrice) {
        //   if (tx.gasPrice.lt(this.db.gasPrice)) {
        //     //TODO
        //   }
        // }
        // alternative add options to deploy task to delete pending tx, combined with --gasprice this would work (except for timing edge case)
      } else {
        console.error(`no access to raw data for tx ${txHash}`);
      }
      if (this.db.logEnabled) {
        console.log(
          `waiting for tx ${txHash}` +
            (txData.name ? ` for ${txData.name} Deployment` : "")
        );
      }
      const receipt = await waitForTx(this.env.ethereum, txHash, false);
      if (receipt.contractAddress && txData.name) {
        await this.saveDeployment(txData.name, {
          ...txData.deployment,
          receipt
        });
      }
      delete pendingTxs[txHash];
      if (Object.keys(pendingTxs).length === 0) {
        fs.removeSync(pendingTxPath);
      } else {
        fs.writeFileSync(pendingTxPath, JSON.stringify(pendingTxs, null, "  "));
      }
    }
  }

  public async onPendingTx(
    tx: TransactionResponse,
    name?: string,
    deployment?: any
  ): Promise<TransactionResponse> {
    if (this.db.writeDeploymentsToFiles && this.db.savePendingTx) {
      const chainId = await getChainId(this.env);
      const deployFolderPath = path.join(
        this.deploymentsPath,
        this.getDeploymentsSubPath(chainId)
      );
      // console.log("tx", tx.hash);
      const pendingTxPath = path.join(deployFolderPath, ".pendingTransactions");
      fs.ensureDirSync(deployFolderPath);
      this.db.pendingTransactions[tx.hash] = name
        ? { name, deployment, rawTx: tx.raw }
        : { rawTx: tx.raw };
      fs.writeFileSync(
        pendingTxPath,
        JSON.stringify(this.db.pendingTransactions, null, "  ")
      );
      // await new Promise(r => setTimeout(r, 20000));
      const wait = tx.wait.bind(tx);
      tx.wait = async () => {
        const receipt = await wait();
        delete this.db.pendingTransactions[tx.hash];
        if (Object.keys(this.db.pendingTransactions).length === 0) {
          fs.removeSync(pendingTxPath);
        } else {
          fs.writeFileSync(
            pendingTxPath,
            JSON.stringify(this.db.pendingTransactions, null, "  ")
          );
        }
        return receipt;
      };
    }
    return tx;
  }

  public async getNamedAccounts(): Promise<{ [name: string]: string }> {
    if (!this.db.accountsLoaded) {
      const chainId = await getChainId(this.env);
      const accounts = await this.env.ethereum.send("eth_accounts");
      this.db.namedAccounts = processNamedAccounts(this.env, accounts, chainId);
      this.db.accountsLoaded = true;
    }
    return this.db.namedAccounts;
  }

  public async loadDeployments(): Promise<{ [name: string]: Deployment }> {
    const chainId = await getChainId(this.env);
    // this.env.deployments.chainId = chainId;
    const folderPath = this.getDeploymentsSubPath(chainId);
    let migrations = {};
    try {
      log("loading migrations");
      migrations = JSON.parse(
        fs
          .readFileSync(
            path.join(this.deploymentsPath, folderPath, ".migrations.json")
          )
          .toString()
      );
    } catch (e) {}
    this.db.migrations = migrations;
    // console.log({ migrations: this.db.migrations });
    addDeployments(this.db, this.deploymentsPath, folderPath);
    this.db.deploymentsLoaded = true;
    return this.db.deployments;
  }

  public async deletePreviousDeployments(): Promise<void> {
    const chainId = await getChainId(this.env);
    const folderPath = this.getDeploymentsSubPath(chainId);
    try {
      fs.removeSync(
        path.join(this.deploymentsPath, folderPath, ".migrations.json")
      );
    } catch (e) {}
    deleteDeployments(this.deploymentsPath, folderPath);
  }

  public async saveDeployment(
    name: string,
    deployment: DeploymentSubmission
  ): Promise<boolean> {
    if (typeof deployment.receipt === undefined) {
      throw new Error("deployment need a receipt");
    }
    if (
      typeof deployment.address === undefined &&
      typeof deployment.receipt.contractAddress === undefined
    ) {
      throw new Error(
        "deployment need a receipt with contractAddress or an address"
      );
    }
    if (typeof deployment.abi === undefined) {
      throw new Error("deployment need an ABI");
    }

    const chainId = await getChainId(this.env);

    const toSave =
      this.db.writeDeploymentsToFiles && this.env.network.saveDeployments;

    const filepath = path.join(
      this.deploymentsPath,
      this.getDeploymentsSubPath(chainId),
      name + ".json"
    );

    // handle ethers receipt :
    const receipt = deployment.receipt;
    const actualReceipt = {
      to: receipt.to,
      from: receipt.from,
      contractAddress: receipt.contractAddress,
      transactionIndex: receipt.transactionIndex,
      gasUsed:
        receipt.gasUsed && receipt.gasUsed._isBigNumber
          ? receipt.gasUsed.toString()
          : receipt.gasUsed,
      logsBloom: receipt.logsBloom,
      blockHash: receipt.blockHash,
      transactionHash: receipt.transactionHash,
      logs: receipt.logs,
      events: receipt.events,
      blockNumber: receipt.blockNumber,
      cumulativeGasUsed:
        receipt.cumulativeGasUsed && receipt.cumulativeGasUsed._isBigNumber
          ? receipt.cumulativeGasUsed.toString()
          : receipt.cumulativeGasUsed,
      status: receipt.status,
      byzantium: receipt.byzantium
    };

    const obj = JSON.parse(
      JSON.stringify({
        abi: deployment.abi,
        receipt: actualReceipt,
        address: deployment.address || actualReceipt.contractAddress,
        args: deployment.args,
        linkedData: deployment.linkedData,
        solidityJson: deployment.solidityJson,
        solidityMetadata: deployment.solidityMetadata,
        bytecode: deployment.bytecode,
        deployedBytecode: deployment.deployedBytecode,
        facets: deployment.facets,
        diamondCuts: deployment.diamondCuts,
        execute: deployment.execute,
        history: deployment.history,
        devdoc: deployment.devdoc,
        userdoc: deployment.userdoc
      })
    );
    this.db.deployments[name] = obj;
    if (obj.address === undefined && obj.transactionHash !== undefined) {
      let receiptFetched;
      try {
        receiptFetched = await waitForTx(
          this.env.ethereum,
          obj.transactionHash,
          true
        );
        obj.address = receiptFetched.contractAddress;
        if (!obj.address) {
          throw new Error("no contractAddress in receipt");
        }
      } catch (e) {
        console.error(e);
        if (toSave) {
          console.log("deleting " + filepath);
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
      try {
        fs.mkdirSync(
          path.join(this.deploymentsPath, this.getDeploymentsSubPath(chainId))
        );
      } catch (e) {}
      fs.writeFileSync(filepath, JSON.stringify(obj, null, "  "));
    }

    // this.spreadEvents();

    return true;
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
      savePendingTx: false
    }
  ): Promise<{ [name: string]: Deployment }> {
    log("runDeploy");
    const chainId = await getChainId(this.env);
    await this.loadDeployments();
    const deploymentFolderPath = this.getDeploymentsSubPath(chainId);
    const wasWrittingToFiles = this.db.writeDeploymentsToFiles;
    this.db.writeDeploymentsToFiles = options.writeDeploymentsToFiles;
    this.db.savePendingTx = options.savePendingTx;
    this.db.logEnabled = options.log;
    this.db.gasPrice = options.gasPrice;
    if (options.resetMemory) {
      log("reseting memory");
      this.db.deployments = {};
      this.db.migrations = {};
    }
    if (options.deletePreviousDeployments) {
      log("deleting previous deployments");
      this.db.deployments = {};
      this.db.migrations = {};
      await this.deletePreviousDeployments();
    } else {
      if (options.savePendingTx) {
        await this.dealWithPendingTransactions(); // TODO deal with reset ?
      }
    }
    if (tags !== undefined && typeof tags === "string") {
      tags = [tags];
    }
    const deployPath =
      this.env.config.paths.deploy ||
      path.join(this.env.config.paths.root, "/deploy"); // TODO extendConfig ?
    let filesStats;
    try {
      filesStats = traverse(deployPath);
    } catch (e) {
      // console.log('no folder at ' + deployPath);
      return {};
    }
    let fileNames = filesStats.map(
      (a: { relativePath: string }) => a.relativePath
    );
    fileNames = fileNames.sort((a: string, b: string) => {
      if (a < b) {
        return -1;
      }
      if (a > b) {
        return 1;
      }
      return 0;
    });
    log("deploy script folder parsed");

    const funcByFilePath: { [filename: string]: DeployFunction } = {};
    const scriptPathBags: { [tag: string]: string[] } = {};
    const scriptFilePaths: string[] = [];
    for (const filename of fileNames) {
      const scriptFilePath = path.join(deployPath, filename);
      let deployFunc: DeployFunction;
      // console.log("fetching " + scriptFilePath);
      try {
        // TODO when watch is enabled : delete require.cache[path.resolve(scriptFilePath)]; // ensure we reload it every time, so changes are taken in consideration
        deployFunc = require(scriptFilePath);
        if ((deployFunc as any).default) {
          deployFunc = (deployFunc as any).default as DeployFunction;
        }
        funcByFilePath[scriptFilePath] = deployFunc;
      } catch (e) {
        // console.error("require failed", e);
        throw new Error(
          "ERROR processing skip func of " +
            scriptFilePath +
            ":\n" +
            (e.stack || e)
        );
      }
      // console.log("get tags if any for " + scriptFilePath);
      let scriptTags = deployFunc.tags;
      if (scriptTags !== undefined) {
        if (typeof scriptTags === "string") {
          scriptTags = [scriptTags];
        }
        for (const tag of scriptTags) {
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
    log("tag collected");

    // console.log({ scriptFilePaths });
    const scriptsRegisteredToRun: { [filename: string]: boolean } = {};
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
            func: deployFunc
          });
        } else {
          scriptsToRun.push({
            filePath: scriptFilePath,
            func: deployFunc
          });
        }
        scriptsRegisteredToRun[scriptFilePath] = true;
      }
    }
    for (const scriptFilePath of scriptFilePaths) {
      recurseDependencies(scriptFilePath);
    }
    log("dependencies collected");

    try {
      for (const deployScript of scriptsToRun.concat(scriptsToRunAtTheEnd)) {
        const filename = path.basename(deployScript.filePath);
        if (this.db.migrations[filename]) {
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
              "ERROR processing skip func of " +
                deployScript.filePath +
                ":\n" +
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
              "ERROR processing " +
                deployScript.filePath +
                ":\n" +
                (e.stack || e)
            );
          }
          log(`executing ${deployScript.filePath} complete`);
          if (result && typeof result === "boolean") {
            this.db.migrations[filename] = Math.floor(Date.now() / 1000);
            // TODO refactor to extract this whole path and folder existence stuff
            const toSave =
              this.db.writeDeploymentsToFiles &&
              this.env.network.saveDeployments;
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
                  ".migrations.json"
                ),
                JSON.stringify(this.db.migrations)
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
    log("deploy scripts complete");

    if (options.exportAll !== undefined) {
      log("load all deployments for export-all");
      const all = loadAllDeployments(this.deploymentsPath, true);
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
          linkedData: deployment.linkedData
        };
      }
      if (all[chainId] === undefined) {
        all[chainId] = {};
      } else {
        // Ensure no past deployments are recorded
        delete all[chainId][this.env.network.name];
      }
      all[chainId][this.env.network.name] = {
        chainId,
        contracts: currentNetworkDeployments
      };
      fs.writeFileSync(options.exportAll, JSON.stringify(all, null, "  ")); // TODO remove bytecode ?
      log("export-all complete");
    }

    if (options.export !== undefined) {
      log("single export...");
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
            linkedData: deployment.linkedData
          };
        }
      } else {
        throw new Error("chainId is undefined");
      }
      const singleExport: Export = {
        chainId,
        contracts: currentNetworkDeployments
      };
      fs.writeFileSync(
        options.export,
        JSON.stringify(singleExport, null, "  ")
      ); // TODO remove bytecode ?
      log("single export complete");
    }
    return this.db.deployments;
  }

  private async saveSnapshot(key: string, data?: any) {
    const snapshot = await this.env.ethereum.send("evm_snapshot", []);
    this.db.pastFixtures[key] = {
      index: ++this.db.snapshotCounter,
      snapshot,
      data,
      deployments: { ...this.db.deployments }
    };
  }

  private async revertSnapshot(
    key: string,
    saved: {
      index: number;
      snapshot: any;
      deployments: any;
    }
  ) {
    const snapshotToRevertIndex = saved.index;
    for (const fixtureKey of Object.keys(this.db.pastFixtures)) {
      const snapshotIndex = this.db.pastFixtures[fixtureKey].index;
      if (snapshotIndex > snapshotToRevertIndex) {
        delete this.db.pastFixtures[fixtureKey];
      }
    }
    await this.env.ethereum.send("evm_revert", [saved.snapshot]);
    saved.snapshot = await this.env.ethereum.send("evm_snapshot", []); // it is necessary to re-snapshot it
    this.db.deployments = { ...saved.deployments };
  }

  private getDeploymentsSubPath(chainId: string): string {
    const name = this.env.network.name;
    const num = parseInt(name, 10);
    let expectedChainId: string;
    if (typeof num === "number" && !isNaN(num)) {
      expectedChainId = name;
    } else {
      expectedChainId = nameToChainId[name];
    }
    if (expectedChainId !== undefined) {
      if (expectedChainId !== BigNumber.from(chainId).toString()) {
        throw new Error(
          `Network name ("${name}") is confusing, chainId is ${chainId}. Was expecting ${expectedChainId}`
        );
      }
      return name;
    }
    return name + "_" + BigNumber.from(chainId).toString();
  }

  // TODO ?
  // private spreadEvents() {
  //   const allEvents [];
  //   const allEventsNames
  //   for (const contractName of Object.keys(this.db.deployments)) {
  //     const deployment = this.db.deployments[contractName];
  //     replaceEvents(deployment, allEvents);
  //   }
  //   for (const contractName of Object.keys(this.db.deployments)) {
  //     const deployment = this.db.deployments[contractName];
  //     replaceEvents(deployment, allEvents);
  //   }
  // }
}
