import { readArtifactSync, readArtifact } from "@nomiclabs/buidler/plugins";
import {
  BuidlerRuntimeEnvironment,
  DeployFunction,
  Deployment,
  DeploymentsExtension,
  FixtureFunc,
  DeploymentSubmission
} from "@nomiclabs/buidler/types";
import fs from "fs";
import path from "path";

import { BigNumber } from "@ethersproject/bignumber";

import debug from "debug";
const log = debug("buidler:wighawag:buidler-deploy");

const {
  addDeployments,
  processNamedAccounts,
  getChainId,
  loadAllDeployments,
  traverse,
  nameToChainId
} = require("./utils");
const {
  addHelpers,
  transformNamedAccounts,
  waitForTx
} = require("./utils/eth");

export class DeploymentsManager {
  public deploymentsExtension: DeploymentsExtension;

  private db: {
    accountsLoaded: boolean;
    namedAccounts: { [name: string]: string };
    loaded: boolean;
    deployments: any;
    noSaving: boolean;
    global_snapshot?: any;
    snapshots: { [name: string]: any };
    pastFixtures: { [name: string]: { data: any; id: any } };
  };

  private env: BuidlerRuntimeEnvironment;
  private deploymentsPath: string;

  constructor(env: BuidlerRuntimeEnvironment) {
    log("constructing DeploymentsManager");
    this.db = {
      accountsLoaded: false,
      namedAccounts: {},
      loaded: false,
      deployments: {},
      noSaving: false,
      snapshots: {},
      pastFixtures: {}
    };
    this.env = env;
    this.deploymentsPath =
      env.config.paths.deployments ||
      path.join(env.config.paths.root, "/deployments");

    // SUPPORT budiler run that recreate an BRE
    const envChainId = process.env.BUIDLER__DEPLOY_PLUGIN_CHAIN_ID;
    const envAccounts = process.env.BUIDLER__DEPLOY_PLUGIN_ACCOUNTS;
    if (envChainId) {
      log("processing namedAccounts synchronously");
      if (!this.db.accountsLoaded) {
        // TODO loadd all ?
        this.db.namedAccounts = processNamedAccounts(
          env,
          envAccounts ? envAccounts.split(".") : [],
          envChainId
        );
        this.db.accountsLoaded = true;
      }
      if (!this.db.loaded) {
        log("loading deployments synchronously");
        addDeployments(
          this.db,
          this.deploymentsPath,
          this.getDeploymentsSubPath(envChainId)
        );
        this.db.loaded = true;
      }
    }

    this.env.getChainId = () => {
      return getChainId(this.env);
    };

    this.deploymentsExtension = {
      save: async (name: string, deployment: Deployment): Promise<boolean> =>
        this.saveDeployment(name, deployment),
      get: async (name: string) => {
        if (!this.db.loaded) {
          await this.loadDeployments();
        }
        const deployment = this.db.deployments[name];
        if (deployment === undefined) {
          throw new Error(`No deployment found for: ${name}`);
        }
        return deployment;
      },
      getOrNull: async (name: string) => {
        if (!this.db.loaded) {
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
      // getChainId: () => {
      //   return getChainId(this.env);
      // },
      run: (
        tags?: string | string[],
        options: {
          reset: boolean;
          noSaving?: boolean;
          export?: string;
        } = {
          reset: true,
          noSaving: true
        }
      ) => {
        const opt = {
          reset: options.reset,
          noSaving: options.noSaving === undefined ? true : options.noSaving,
          export: options.export
        };
        return this.runDeploy(tags, opt);
      },
      fixture: async (tags?: string | string[]) => {
        if (typeof tags === "string") {
          tags = [tags];
        }
        let snapshotKey;
        if (tags !== undefined) {
          snapshotKey = tags.join(".");
        }
        if (this.db.global_snapshot) {
          await this.env.ethereum.send("evm_revert", [this.db.global_snapshot]);
          this.db.global_snapshot = await this.env.ethereum.send(
            "evm_snapshot",
            []
          ); // is that necessary ?
          return this.db.deployments;
        } else if (
          tags !== undefined &&
          snapshotKey !== undefined &&
          this.db.snapshots[snapshotKey]
        ) {
          await this.env.ethereum.send("evm_revert", [
            this.db.snapshots[snapshotKey]
          ]);
          this.db.snapshots[snapshotKey] = await this.env.ethereum.send(
            "evm_snapshot",
            []
          ); // is that necessary ?
          return this.db.deployments;
        }
        await this.runDeploy(tags, {
          reset: true,
          noSaving: true
        });

        const id = await this.env.ethereum.send("evm_snapshot", []);
        if (snapshotKey !== undefined) {
          this.db.snapshots[snapshotKey] = id;
        } else {
          this.db.global_snapshot = id;
        }
        return this.db.deployments;
      },
      createFixture: (func: FixtureFunc, forceId?: string) => {
        let id: any;
        let data: any;
        if (
          forceId !== undefined &&
          this.db.pastFixtures[forceId] !== undefined
        ) {
          id = this.db.pastFixtures[forceId].id;
          data = this.db.pastFixtures[forceId].data;
        }
        return async () => {
          if (id === undefined) {
            data = await func(this.env);
            id = await this.env.ethereum.send("evm_snapshot", []);
            if (forceId !== undefined) {
              this.db.pastFixtures[forceId] = { id, data };
            }
          } else {
            await this.env.ethereum.send("evm_revert", [id]);
            id = await this.env.ethereum.send("evm_snapshot", []); // is that necesary
          }
          return data;
        };
      },
      log: (...args: any[]) => {
        if (!this.db.noSaving) {
          console.log(...args);
        }
      }
    } as any;

    log("adding helpers");
    addHelpers(
      env,
      this.deploymentsExtension,
      this.deploymentsExtension.getArtifact
    );

    // this.runDeploy().catch(console.error);
  }

  public async getNamedAccounts(): Promise<{ [name: string]: string }> {
    if (!this.db.accountsLoaded) {
      await this.addNamedAccounts();
    }
    return this.db.namedAccounts;
  }

  public async addNamedAccounts() {
    const chainId = await getChainId(this.env);
    const accounts = await this.env.ethereum.send("eth_accounts");
    this.db.namedAccounts = processNamedAccounts(this.env, accounts, chainId);
    this.db.accountsLoaded = true;
    return this.db.namedAccounts;
  }

  public async loadDeployments(): Promise<{ [name: string]: Deployment }> {
    const chainId = await getChainId(this.env);
    // this.env.deployments.chainId = chainId;
    addDeployments(
      this.db,
      this.deploymentsPath,
      this.getDeploymentsSubPath(chainId)
    );
    this.db.loaded = true;
    return this.db.deployments;
  }

  public async saveDeployment(
    name: string,
    deployment: DeploymentSubmission
  ): Promise<boolean> {
    if (typeof deployment.receipt === undefined) {
      throw new Error("deployment need a receipt");
    }
    if (typeof deployment.receipt.contractAddress === undefined) {
      throw new Error("deployment need a receipt with contractAddress");
    }
    if (typeof deployment.abi === undefined) {
      throw new Error("deployment need an ABI");
    }

    const chainId = await getChainId(this.env);

    const toSave = !this.db.noSaving && this.env.network.live;

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
        deployedBytecode: deployment.deployedBytecode
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
      reset: boolean;
      noSaving: boolean;
      export?: string;
      exportAll?: string;
    } = {
      reset: true,
      noSaving: false
    }
  ): Promise<{ [name: string]: Deployment }> {
    log("runDeploy");
    if (tags !== undefined && typeof tags === "string") {
      tags = [tags];
    }
    if (options.reset) {
      this.db.deployments = {};
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

    if (options.noSaving) {
      this.db.noSaving = true;
    }
    try {
      for (const deployScript of scriptsToRun.concat(scriptsToRunAtTheEnd)) {
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
          try {
            await deployScript.func(this.env);
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
        }
      }
    } catch (e) {
      this.db.noSaving = false;
      throw e;
    }
    log("deploy scripts complete");

    const chainId = await getChainId(this.env);
    this.db.noSaving = false;
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
        all[chainId] = [];
      } else {
        // Ensure no past deployments are recorded
        all[chainId] = all[chainId].filter(
          (value: any) => value.name !== this.env.network.name
        );
      }
      all[chainId].push({
        name: this.env.network.name,
        contracts: currentNetworkDeployments
      });
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
      fs.writeFileSync(
        options.export,
        JSON.stringify(
          {
            chainId,
            contracts: currentNetworkDeployments
          },
          null,
          "  "
        )
      ); // TODO remove bytecode ?
      log("single export complete");
    }
    return this.db.deployments;
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
      if (expectedChainId !== BigNumber.from(chainId).toHexString()) {
        throw new Error(
          `Network name ("${name}") is confusing, chainId is ${chainId}. Was expecting ${expectedChainId}`
        );
      }
      return name;
    }
    return name + "_" + BigNumber.from(chainId).toHexString();
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
