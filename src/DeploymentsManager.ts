import { readArtifactSync, readArtifact } from "@nomiclabs/buidler/plugins";
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
      env.config.paths.deployments ||
      path.join(env.config.paths.root, "/deployments");

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
      getChainId,
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

    // console.log({ scriptFilePaths });
    const scriptsRegisteredToRun: { [filename: string]: boolean } = {};
    const scriptsToRun: Array<{
      func: DeployFunction;
      filePath: string;
    }> = [];
    function recurseDependencies(scriptFilePath: string) {
      const deployFunc = funcByFilePath[scriptFilePath];
      if (deployFunc.dependencies) {
        for (const dependency of deployFunc.dependencies) {
          const scriptFilePathsToAdd = scriptPathBags[dependency];
          if (scriptFilePathsToAdd) {
            for (const scriptFilenameToAdd of scriptFilePathsToAdd) {
              const scriptToAdd = funcByFilePath[scriptFilenameToAdd];
              if (!scriptsRegisteredToRun[scriptFilenameToAdd]) {
                recurseDependencies(scriptFilenameToAdd);
                if (!scriptsRegisteredToRun[deployFunc as any]) {
                  scriptsToRun.push({
                    filePath: scriptFilenameToAdd,
                    func: scriptToAdd
                  });
                  scriptsRegisteredToRun[scriptFilenameToAdd] = true;
                }
              }
            }
          }
        }
      }
      if (!scriptsRegisteredToRun[scriptFilePath]) {
        scriptsToRun.push({
          filePath: scriptFilePath,
          func: deployFunc
        });
        scriptsRegisteredToRun[scriptFilePath] = true;
      }
    }
    for (const scriptFilePath of scriptFilePaths) {
      recurseDependencies(scriptFilePath);
    }

    if (options.noSaving) {
      this.db.noSaving = true;
    }
    try {
      for (const deployScript of scriptsToRun) {
        let skip = false;
        if (deployScript.func.skip) {
          // console.log(`should we skip  ${deployScript.filePath} ?`);
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
        }
        if (!skip) {
          // console.log(`trying  ${deployScript.filePath}`);
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
