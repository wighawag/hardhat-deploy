import * as fs from "fs-extra";
import * as path from "path";
import { getAddress } from "@ethersproject/address";
import { Interface, FunctionFragment, Fragment } from "@ethersproject/abi";
import {
  Artifact,
  HardhatRuntimeEnvironment,
  MultiExport
} from "hardhat/types";
import { BigNumber } from "@ethersproject/bignumber";
import { ExtendedArtifact } from "./types";
import { Artifacts } from "hardhat/internal/artifacts";
import { artifacts } from "hardhat";

let chainId: string;
export async function getChainId(hre: HardhatRuntimeEnvironment) {
  if (chainId) {
    return chainId;
  }
  try {
    chainId = await hre.network.provider.send("eth_chainId");
  } catch (e) {
    console.log("failed to get chainId, falling back on net_version...");
    chainId = await hre.network.provider.send("net_version");
  }

  if (chainId.startsWith("0x")) {
    chainId = BigNumber.from(chainId).toString();
  }

  return chainId;
}

export function getArtifactFromFolderSync(
  name: string,
  folderPath: string
): Artifact | undefined {
  const artifacts = new Artifacts(folderPath);
  let artifact;
  try {
    artifact = JSON.parse(
      fs.readFileSync(path.join(folderPath, name + ".json")).toString()
    );
  } catch (e) {}
  if (!artifact) {
    try {
      artifact = artifacts.readArtifactSync(name);
    } catch (e) {}
  }
  return artifact;
}

export async function getArtifactFromFolder(
  name: string,
  folderPath: string
): Promise<Artifact | undefined> {
  return getArtifactFromFolderSync(name, folderPath);
}

export function getExtendedArtifactFromFolderSync(
  name: string,
  folderPath: string
): ExtendedArtifact | undefined {
  const artifacts = new Artifacts(folderPath);
  let artifact;
  try {
    artifact = JSON.parse(
      fs.readFileSync(path.join(folderPath, name + ".json")).toString()
    );
  } catch (e) {}
  if (!artifact) {
    try {
      artifact = artifacts.readArtifactSync(name);
    } catch (e) {}
    if (artifact && artifact._format === "hh-sol-artifact-1") {
      const debugFilePath = path.join(
        folderPath,
        artifact.sourceName,
        name + ".dbg.json"
      );
      // console.log(`getting debug file ${debugFilePath}`);
      let debugJson;
      try {
        debugJson = JSON.parse(fs.readFileSync(debugFilePath).toString());
      } catch (e) {
        console.error(e);
      }
      if (debugJson) {
        const buildInfoFilePath = path.join(
          path.dirname(debugFilePath),
          debugJson.buildInfo
        );
        // console.log(`getting buildInfo file ${buildInfoFilePath}`);
        let buildInfo;
        try {
          buildInfo = JSON.parse(fs.readFileSync(buildInfoFilePath).toString());
        } catch (e) {
          console.error(e);
        }

        if (buildInfo) {
          artifact = {
            ...artifact,
            ...buildInfo.output.contracts[artifact.sourceName][name],
            solcInput: JSON.stringify(buildInfo.input, null, "  "),
            solcInputHash: path.basename(buildInfoFilePath, ".json")
          };
        }
      }
    }
  }
  return artifact;
}

export async function getExtendedArtifactFromFolder(
  name: string,
  folderPath: string
): Promise<ExtendedArtifact | undefined> {
  return getExtendedArtifactFromFolderSync(name, folderPath);
}

export function loadAllDeployments(
  hre: HardhatRuntimeEnvironment,
  deploymentsPath: string,
  onlyABIAndAddress?: boolean,
  externalDeployments?: { [networkName: string]: string[] }
) {
  const all: MultiExport = {}; // TODO any is chainConfig
  fs.readdirSync(deploymentsPath).forEach(fileName => {
    const fPath = path.resolve(deploymentsPath, fileName);
    const stats = fs.statSync(fPath);
    let name = fileName;
    if (stats.isDirectory()) {
      let chainIdFound: string;
      const chainIdFilepath = path.join(fPath, ".chainId");
      if (fs.existsSync(chainIdFilepath)) {
        chainIdFound = fs
          .readFileSync(chainIdFilepath)
          .toString()
          .trim();
        name = fileName;
      } else {
        throw new Error(
          `with hardhat-deploy >= 0.6 you need to rename network folder without appended chainId
          You also need to create a '.chainId' file in the folder with the chainId`
        );
      }

      if (!all[chainIdFound]) {
        all[chainIdFound] = {};
      }
      const contracts = loadDeployments(
        deploymentsPath,
        fileName,
        onlyABIAndAddress
      );
      all[chainIdFound][name] = {
        name,
        chainId: chainIdFound,
        contracts
      };
    }
  });

  if (externalDeployments) {
    for (const networkName of Object.keys(externalDeployments)) {
      for (const folderPath of externalDeployments[networkName]) {
        const networkConfig = hre.config.networks[networkName];
        if (networkConfig && networkConfig.chainId) {
          const networkChainId = networkConfig.chainId.toString();
          const contracts = loadDeployments(
            folderPath,
            "",
            onlyABIAndAddress,
            undefined,
            networkChainId
          );
          all[chainId][networkName] = {
            name: networkName,
            chainId: networkChainId,
            contracts
          };
        } else {
          console.warn(
            `export-all limitation: attempting to load external deployments from ${folderPath} without chainId info. Please set the chainId in the network config for ${networkName}`
          );
        }
      }
    }
  }
  return all;
}

export function deleteDeployments(deploymentsPath: string, subPath: string) {
  const deployPath = path.join(deploymentsPath, subPath);
  fs.removeSync(deployPath);
}

function loadDeployments(
  deploymentsPath: string,
  subPath: string,
  onlyABIAndAddress?: boolean,
  expectedChainId?: string,
  truffleChainId?: string
) {
  const deploymentsFound: { [name: string]: any } = {};
  const deployPath = path.join(deploymentsPath, subPath);

  let filesStats;
  try {
    filesStats = traverse(
      deployPath,
      undefined,
      undefined,
      name => !name.startsWith(".") && name !== "solcInputs"
    );
  } catch (e) {
    // console.log('no folder at ' + deployPath);
    return {};
  }
  if (filesStats.length > 0) {
    if (expectedChainId) {
      const chainIdFilepath = path.join(deployPath, ".chainId");
      if (fs.existsSync(chainIdFilepath)) {
        const chainIdFound = fs
          .readFileSync(chainIdFilepath)
          .toString()
          .trim();
        if (expectedChainId !== chainIdFound) {
          throw new Error(
            `Loading deployment in folder '${deployPath}' (with chainId: ${chainIdFound}) for a different chainId (${expectedChainId})`
          );
        }
      } else {
        throw new Error(
          `with hardhat-deploy >= 0.6 you are expected to create a '.chainId' file in the deployment folder`
        );
      }
    }
  }
  let fileNames = filesStats.map(a => a.relativePath);
  fileNames = fileNames.sort((a, b) => {
    if (a < b) {
      return -1;
    }
    if (a > b) {
      return 1;
    }
    return 0;
  });

  for (const fileName of fileNames) {
    if (fileName.substr(fileName.length - 5) === ".json") {
      const deploymentFileName = path.join(deployPath, fileName);
      let deployment = JSON.parse(
        fs.readFileSync(deploymentFileName).toString()
      );
      if (!deployment.address && deployment.networks) {
        if (truffleChainId && deployment.networks[truffleChainId]) {
          // TRUFFLE support
          const truffleDeployment = deployment as any; // TruffleDeployment;
          deployment.address =
            truffleDeployment.networks[truffleChainId].address;
          deployment.transactionHash =
            truffleDeployment.networks[truffleChainId].transactionHash;
        }
      }
      if (onlyABIAndAddress) {
        deployment = {
          address: deployment.address,
          abi: deployment.abi,
          linkedData: deployment.linkedData
        };
      }
      const name = fileName.slice(0, fileName.length - 5);
      // console.log('fetching ' + deploymentFileName + '  for ' + name);

      deploymentsFound[name] = deployment;
    }
  }
  return deploymentsFound;
}

export function addDeployments(
  db: any,
  deploymentsPath: string,
  subPath: string,
  expectedChainId?: string,
  truffleChainId?: string
) {
  const contracts = loadDeployments(
    deploymentsPath,
    subPath,
    false,
    expectedChainId,
    truffleChainId
  );
  for (const key of Object.keys(contracts)) {
    db.deployments[key] = contracts[key];
    // TODO ABIS
    // db.abis[contracts[key].address] = mergeABI(
    //   db.abis[contracts[key].address],
    //   contracts[key].abi
    // );
  }
}

function transformNamedAccounts(
  configNamedAccounts: { [name: string]: any },
  chainIdGiven: string | number,
  accounts: string[],
  networkConfigName: string
): { namedAccounts: { [name: string]: string }; unnamedAccounts: string[] } {
  const namedAccounts: { [name: string]: string } = {};
  const usedAccounts: { [address: string]: boolean } = {};
  // TODO transform into checksum  address
  if (configNamedAccounts) {
    const accountNames = Object.keys(configNamedAccounts);
    function parseSpec(spec: any): string | undefined {
      let address: string | undefined;
      switch (typeof spec) {
        case "string":
          if (spec.slice(0, 2).toLowerCase() === "0x") {
            address = spec;
          } else {
            address = parseSpec(configNamedAccounts[spec]);
          }
          break;
        case "number":
          if (accounts) {
            address = accounts[spec];
          }
          break;
        case "undefined":
          break;
        case "object":
          if (spec) {
            if (spec.type === "object") {
              address = spec;
            } else {
              const newSpec = chainConfig(
                spec,
                chainIdGiven,
                networkConfigName
              );
              if (typeof newSpec !== "undefined") {
                address = parseSpec(newSpec);
              }
            }
          }
          break;
      }
      if (address) {
        if (typeof address === "string") {
          address = getAddress(address);
        }
      }
      return address;
    }

    for (const accountName of accountNames) {
      const spec = configNamedAccounts[accountName];
      const address = parseSpec(spec);
      if (address) {
        namedAccounts[accountName] = address;
        usedAccounts[address] = true;
      }
    }
  }
  const unnamedAccounts = [];
  for (const address of accounts) {
    if (!usedAccounts[address]) {
      unnamedAccounts.push(getAddress(address));
    }
  }
  return { namedAccounts, unnamedAccounts };
}

function chainConfig(
  object: any,
  chainIdGiven: string | number,
  networkConfigName: string
) {
  // TODO utility function:
  let chainIdDecimal;
  if (typeof chainIdGiven === "number") {
    chainIdDecimal = "" + chainIdGiven;
  } else {
    if (chainIdGiven.startsWith("0x")) {
      chainIdDecimal = "" + parseInt(chainIdGiven.slice(2), 16);
    } else {
      chainIdDecimal = chainIdGiven;
    }
  }
  if (typeof object[networkConfigName] !== "undefined") {
    return object[networkConfigName];
  } else if (typeof object[chainIdGiven] !== "undefined") {
    return object[chainIdGiven];
  } else if (typeof object[chainIdDecimal] !== "undefined") {
    return object[chainIdDecimal];
  } else {
    return object.default;
  }
}

export function processNamedAccounts(
  hre: HardhatRuntimeEnvironment,
  accounts: string[],
  chainIdGiven: string
): { namedAccounts: { [name: string]: string }; unnamedAccounts: string[] } {
  if (hre.config.namedAccounts) {
    return transformNamedAccounts(
      hre.config.namedAccounts,
      chainIdGiven,
      accounts,
      hre.network.name
    );
  } else {
    return { namedAccounts: {}, unnamedAccounts: [] };
  }
}

export const traverse = function(
  dir: string,
  result: any[] = [],
  topDir?: string,
  filter?: (name: string, stats: any) => boolean // TODO any is Stats
): Array<{
  name: string;
  path: string;
  relativePath: string;
  mtimeMs: number;
  directory: boolean;
}> {
  fs.readdirSync(dir).forEach(name => {
    const fPath = path.resolve(dir, name);
    const stats = fs.statSync(fPath);
    if ((!filter && !name.startsWith(".")) || (filter && filter(name, stats))) {
      const fileStats = {
        name,
        path: fPath,
        relativePath: path.relative(topDir || dir, fPath),
        mtimeMs: stats.mtimeMs,
        directory: stats.isDirectory()
      };
      if (fileStats.directory) {
        result.push(fileStats);
        return traverse(fPath, result, topDir || dir, filter);
      }
      result.push(fileStats);
    }
  });
  return result;
};

export function mergeABIs(check: boolean, ...abis: any[][]): any[] {
  if (abis.length === 0) {
    return [];
  }
  const result = abis[0];

  for (let i = 1; i < abis.length; i++) {
    const abi = abis[i];
    for (const fragment of abi) {
      const newEthersFragment = Fragment.from(fragment);
      // TODO constructor special handling ?
      const foundSameSig = result.find(v => {
        const existingEthersFragment = Fragment.from(v);
        if (v.type !== fragment.type) {
          return false;
        }
        if (!existingEthersFragment) {
          return v.name === fragment.name; // TODO fallback and receive hanlding
        }

        if (
          existingEthersFragment.type === "constructor" ||
          newEthersFragment.type === "constructor"
        ) {
          return existingEthersFragment.name === newEthersFragment.name;
        }

        if (newEthersFragment.type === "function") {
          return (
            Interface.getSighash(existingEthersFragment as FunctionFragment) ===
            Interface.getSighash(newEthersFragment as FunctionFragment)
          );
        } else if (newEthersFragment.type === "event") {
          return existingEthersFragment.format() === newEthersFragment.format();
        } else {
          return v.name === fragment.name; // TODO fallback and receive hanlding
        }
      });
      if (foundSameSig) {
        if (check) {
          if (fragment.type === "function") {
            throw new Error(
              `function "${fragment.name}" will shadow "${foundSameSig.name}". Please update code to avoid conflict.`
            );
          }
        }
      } else {
        result.push(fragment);
      }
    }
  }

  return result;
}
