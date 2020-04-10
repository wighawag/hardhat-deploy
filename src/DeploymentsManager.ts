import { readArtifactSync } from "@nomiclabs/buidler/plugins";
import {
  BuidlerRuntimeEnvironment,
  DeployFunction,
  Deployment,
  DeploymentsExtension
} from "@nomiclabs/buidler/types";
import fs from "fs";
import path from "path";

const {
  addDeployments,
  addNamedAccounts,
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

  private db: { loaded: boolean; deployments: any; noSaving: boolean };

  private env: BuidlerRuntimeEnvironment;
  private deploymentsPath: string;

  constructor(env: BuidlerRuntimeEnvironment) {
    this.db = {
      loaded: false,
      deployments: {},
      noSaving: false
    };
    this.env = env;
    this.deploymentsPath =
      env.config.paths.deployments || env.config.paths.root + "/deployments";

    // SUPPORT budiler run that recreate an BRE
    const envChainId = process.env.BUIDLER__DEPLOY_PLUGIN_CHAIN_ID;
    const envAccounts = process.env.BUIDLER__DEPLOY_PLUGIN_ACCOUNTS;
    if (envChainId) {
      addNamedAccounts(
        env,
        envAccounts ? envAccounts.split(".") : [],
        envChainId
      );
      if (!this.db.loaded) {
        addDeployments(
          this.db,
          this.deploymentsPath,
          this.getDeploymentsSubPath(envChainId)
        );
        this.db.loaded = true;
      }
    }

    this.deploymentsExtension = {
      save: async (name: string, deployment: Deployment): Promise<boolean> =>
        this.saveDeployment(name, deployment),
      get: async (name: string) => {
        if (!this.db.loaded) {
          await this.loadDeployments();
        }
        return this.db.deployments[name];
      },
      all: async () => {
        return this.db.deployments; // TODO copy
      },
      getArtifact: async (contractName: string): Promise<any> => {
        return readArtifactSync(this.env.config.paths.artifacts, contractName);
      },
      getArtifactSync: (contractName: string): any => {
        return readArtifactSync(this.env.config.paths.artifacts, contractName);
      },
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
      log: (...args: any[]) => {
        if (!this.db.noSaving) {
          console.log(...args);
        }
      }
    } as any;

    addHelpers(
      env,
      this.deploymentsExtension,
      this.deploymentsExtension.getArtifact
    );

    // this.runDeploy().catch(console.error);
  }

  public async addNamedAccounts() {
    const chainId = await getChainId(this.env);
    const accounts = await this.env.ethereum.send("eth_accounts");
    addNamedAccounts(this.env, accounts, chainId);
    return this.env.namedAccounts;
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
    deployment: Deployment
  ): Promise<boolean> {
    const chainId = await getChainId(this.env);

    const toSave = !this.db.noSaving && this.env.network.live;

    const filepath = path.join(
      this.deploymentsPath,
      this.getDeploymentsSubPath(chainId),
      name + ".json"
    );

    const obj = JSON.parse(
      JSON.stringify({
        transactionHash: deployment.transactionHash,
        args: deployment.args,
        abi: deployment.abi,
        address: deployment.address,
        linkedData: deployment.linkedData,
        solidityJson: deployment.solidityJson,
        solidityMetadata: deployment.solidityMetadata
      })
    );
    this.db.deployments[name] = obj;
    if (obj.address === undefined && obj.transactionHash !== undefined) {
      let receipt;
      try {
        receipt = await waitForTx(this.env.ethereum, obj.transactionHash, true);
        obj.address = receipt.contractAddress;
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
    if (options.reset) {
      this.db.deployments = {};
    }
    const deployPath =
      this.env.config.paths.deploy || this.env.config.paths.root + "/deploy"; // TODO extendConfig ?
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

    const scriptPaths: any = {};
    const scriptsBags: { [tag: string]: DeployFunction[] } = {};
    const scripts: DeployFunction[] = [];
    for (const fileName of fileNames) {
      const scriptFilePath = deployPath + "/" + fileName;
      let deployScript: DeployFunction;
      // console.log('fetching ' + scriptFilePath);
      try {
        deployScript = require(scriptFilePath);
        if ((deployScript as any).default) {
          deployScript = (deployScript as any).default as DeployFunction;
        }
        scriptPaths[deployScript as any] = scriptFilePath;
      } catch (e) {
        console.error("require failed", e);
        throw new Error(
          "ERROR processing skip func of " +
            scriptFilePath +
            ":\n" +
            (e.stack || e)
        );
      }
      let scriptTags = deployScript.tags;
      if (scriptTags !== undefined) {
        if (typeof scriptTags === "string") {
          scriptTags = [scriptTags];
        }
        for (const tag of scriptTags) {
          const bag = scriptsBags[tag] || [];
          scriptsBags[tag] = bag;
          bag.push(deployScript);
        }
      }
      if (tags !== undefined) {
        let found = false;
        if (scriptTags !== undefined) {
          for (const tagToFind of tags) {
            for (const tag of scriptTags) {
              if (tag === tagToFind) {
                scripts.push(deployScript);
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
        scripts.push(deployScript);
      }
    }

    const scriptsRegisteredToRun: any = {};
    const scriptsToRun: DeployFunction[] = [];
    function recurseDependencies(deployScript: DeployFunction) {
      if (deployScript.dependencies) {
        for (const dependency of deployScript.dependencies) {
          const scriptsToAdd = scriptsBags[dependency];
          if (scriptsToAdd) {
            for (const scriptToAdd of scriptsToAdd) {
              if (!scriptsRegisteredToRun[scriptsToAdd as any]) {
                recurseDependencies(scriptToAdd);
                if (!scriptsRegisteredToRun[deployScript as any]) {
                  scriptsToRun.push(scriptToAdd);
                  scriptsRegisteredToRun[scriptsToAdd as any] = true;
                }
              }
            }
          }
        }
      }
      if (!scriptsRegisteredToRun[deployScript as any]) {
        scriptsToRun.push(deployScript);
        scriptsRegisteredToRun[deployScript as any] = true;
      }
    }
    for (const deployScript of scripts) {
      recurseDependencies(deployScript);
    }

    if (options.noSaving) {
      this.db.noSaving = true;
    }
    try {
      for (const deployScript of scriptsToRun) {
        let skip = false;
        // console.log('trying ' + scriptPaths[deployScript as any]);
        if (deployScript.skip) {
          try {
            skip = await deployScript.skip(this.env);
          } catch (e) {
            console.error("skip failed", e);
            throw new Error(
              "ERROR processing skip func of " +
                scriptPaths[deployScript as any] +
                ":\n" +
                (e.stack || e)
            );
          }
        }
        if (!skip) {
          try {
            await deployScript(this.env);
          } catch (e) {
            console.error("execution failed", e);
            throw new Error(
              "ERROR processing " +
                scriptPaths[deployScript as any] +
                ":\n" +
                (e.stack || e)
            );
          }
        }
      }
    } catch (e) {
      this.db.noSaving = false;
      throw e;
    }

    const chainId = await getChainId();
    this.db.noSaving = false;
    if (options.exportAll !== undefined) {
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
    }

    if (options.export !== undefined) {
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
      if (expectedChainId !== chainId) {
        throw new Error(
          `Network name ("${name}") is confusing, chainId is ${chainId}. Was expecting ${expectedChainId}`
        );
      }
      return name;
    }
    return name + "_" + chainId;
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
