import * as fs from "fs-extra";
import * as path from "path";
import { getAddress } from "@ethersproject/address";
import {
  BuidlerRuntimeEnvironment,
  MultiExport
} from "@nomiclabs/buidler/types";
import { BigNumber } from "@ethersproject/bignumber";

let chainId: string;
export async function getChainId(bre: BuidlerRuntimeEnvironment) {
  if (chainId) {
    return chainId;
  }
  try {
    chainId = await bre.ethereum.send("eth_chainId");
  } catch (e) {
    console.log("failed to get chainId, falling back on net_version...");
    chainId = await bre.ethereum.send("net_version");
  }

  if (chainId.startsWith("0x")) {
    chainId = BigNumber.from(chainId).toString();
  }

  return chainId;
}

export function loadAllDeployments(
  deploymentsPath: string,
  onlyABIAndAddress?: boolean
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
          `with buidler-deploy >= 0.6 you need to rename network folder without appended chainId
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
  expectedChainId?: string
) {
  const deploymentsFound: { [name: string]: any } = {};
  const deployPath = path.join(deploymentsPath, subPath);

  if (expectedChainId) {
    const chainIdFilepath = path.join(deployPath, ".chainId");
    if (fs.existsSync(chainIdFilepath)) {
      const chainIdFound = fs
        .readFileSync(chainIdFilepath)
        .toString()
        .trim();
      if (expectedChainId !== chainId) {
        throw new Error(
          `Loading deployment in folder '${deployPath}' (with chainId: ${chainIdFound}) for a different chainId (${expectedChainId})`
        );
      }
    } else {
      console.warn(
        `with buidler-deploy >= 0.6 you are expected to create a '.chainId' file in the deployment folder`
      );
    }
  }

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
  expectedChainId?: string
) {
  const contracts = loadDeployments(
    deploymentsPath,
    subPath,
    false,
    expectedChainId
  );
  for (const key of Object.keys(contracts)) {
    db.deployments[key] = contracts[key];
  }
}

function transformNamedAccounts(
  configNamedAccounts: { [name: string]: any },
  chainIdGiven: string | number,
  accounts: string[],
  networkConfigName: string
) {
  const namedAccounts: { [name: string]: string } = {};
  // TODO transform into checksum  address
  if (configNamedAccounts) {
    const accountNames = Object.keys(configNamedAccounts);
    function parseSpec(spec: any): string {
      let address;
      switch (typeof spec) {
        case "string":
          if (spec.slice(0, 5) === "from:") {
            const from = parseInt(spec.substr(5), 10);
            address = [];
            if (accounts) {
              for (let j = from; j < accounts.length; j++) {
                address.push(accounts[j]);
              }
            }
          } else if (spec.slice(0, 2).toLowerCase() === "0x") {
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
            } else if (Array.isArray(spec)) {
              // TODO fix :this will never reach here (Array is of type "object")
              address = [];
              for (const subSpec of spec) {
                address.push(parseSpec(subSpec));
              }
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
        } else if (typeof address === "object" && address.length) {
          address = address.map(getAddress);
        }
      }
      return address;
    }

    for (const accountName of accountNames) {
      const spec = configNamedAccounts[accountName];
      namedAccounts[accountName] = parseSpec(spec);
    }
  }
  return namedAccounts;
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
  bre: BuidlerRuntimeEnvironment,
  accounts: string[],
  chainIdGiven: string
) {
  if (bre.config.namedAccounts) {
    return transformNamedAccounts(
      bre.config.namedAccounts,
      chainIdGiven,
      accounts,
      bre.network.name
    );
  } else {
    return {};
  }
}

export const traverse = function(
  dir: string,
  result: any[] = [],
  topDir?: string,
  filter?: (name: string, stats: any) => boolean // TODO any is Stats
): any[] {
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
