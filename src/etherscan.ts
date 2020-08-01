import fs from "fs";
import axios from "axios";
import qs from "qs";
import path from "path";
import { defaultAbiCoder, ParamType } from "@ethersproject/abi";
import { BuidlerRuntimeEnvironment } from "@nomiclabs/buidler/types";
import chalk from "chalk";

function log(...args: any[]) {
  console.log(...args);
}

function logError(...args: any[]) {
  console.log(chalk.red(...args));
}

function logInfo(...args: any[]) {
  console.log(chalk.yellow(...args));
}

function logSuccess(...args: any[]) {
  console.log(chalk.green(...args));
}

export async function submitSources(
  bre: BuidlerRuntimeEnvironment,
  solcInputsPath: string,
  config?: {
    etherscanApiKey?: string;
    license?: string;
    fallbackOnSolcInput?: boolean;
  }
) {
  config = config || {};
  const fallbackOnSolcInput = config.fallbackOnSolcInput;
  const license = config.license || "None";
  const etherscanApiKey = config.etherscanApiKey;
  const chainId = await bre.getChainId();
  const all = await bre.deployments.all();
  let host: string;
  switch (chainId) {
    case "1":
      host = "https://api.etherscan.io";
      break;
    case "3":
      host = "https://api-ropsten.etherscan.io";
      break;
    case "4":
      host = "https://api-rinkeby.etherscan.io";
      break;
    case "5":
      host = "https://api-goerli.etherscan.io";
      break;
    case "42":
      host = "https://api-kovan.etherscan.io";
      break;
    default:
      return logError(`Network with chainId: ${chainId} not supported`);
  }

  const licenseType = (() => {
    if (!license || license === "None") {
      return 1;
    }
    if (license === "Unlicense") {
      return 2;
    }
    if (license === "MIT") {
      return 3;
    }
    if (license === "GPL-2.0") {
      return 4;
    }
    if (license === "GPL-3.0") {
      return 5;
    }
    if (license === "LGPL-2.1") {
      return 6;
    }
    if (license === "LGPL-3.0") {
      return 7;
    }
    if (license === "BSD-2-Clause") {
      return 8;
    }
    if (license === "BSD-3-Clause") {
      return 9;
    }
    if (license === "MPL-2.0") {
      return 10;
    }
    if (license === "OSL-3.0") {
      return 11;
    }
    if (license === "Apache-2.0") {
      return 12;
    }
    if (license === "AGPL-3.0") {
      return 13;
    }
  })();
  if (!licenseType) {
    return logError(
      `license :"${license}" not supported by etherscan, list of supported license can be found here : https://etherscan.io/contract-license-types . This tool expect the SPDX id, except for "None" and "Unlicense"`
    );
  }

  async function submit(name: string, useSolcInput?: boolean) {
    const deployment = all[name];
    const { address, metadata: metadataString } = deployment;
    const abiResponse = await axios.get(
      `${host}/api?module=contract&action=getabi&address=${address}&apikey=${etherscanApiKey}`
    );
    const { data: abiData } = abiResponse;
    let contractABI;
    if (abiData.status !== "0") {
      try {
        contractABI = JSON.parse(abiData.result);
      } catch (e) {
        logError(e);
        return;
      }
    }
    if (contractABI && contractABI !== "") {
      log(`already verified: ${name} (${address}), skipping.`);
      return;
    }
    if (!metadataString) {
      logError(
        `Contract ${name} was deployed without saving metadata. Cannot submit to etherscan, skipping.`
      );
      return;
    }
    const metadata = JSON.parse(metadataString);

    let contractNamePath: string | undefined;
    const contractFilepath = deployment.contractFilepath;
    let contractName = deployment.contractName;
    if (!contractName) {
      logInfo(`contractName is missing for ${name}`);
      logInfo(`falling back on "${name}"`); // TODO remove ?
      contractName = name;
      // console.error(`contractName is missing for ${name}`);
      // continue;
    }
    if (contractFilepath) {
      contractNamePath = `${contractFilepath}:${contractName}`;
    } else {
      logInfo(`contractFilepath is missing for ${name}`);

      // TODO remove ?
      process.stdout.write(
        chalk.yellow(`falling back on finding the same filename in sources...`)
      );
      for (const contractPath of Object.keys(metadata.sources)) {
        if (path.basename(contractPath, ".sol") === contractName) {
          contractNamePath = `${contractPath}:${contractName}`;
        }
      }
      if (!contractNamePath) {
        logError(
          `\ncannot find contract path in sources for name: ${contractName}`
        );
        return;
      }
      process.stdout.write(chalk.green(` found\n`));
      // console.error(`contractName is missing for ${name}`);
      // continue;
    }

    let solcInput;
    if (useSolcInput) {
      const solcInputHash = deployment.solcInputHash;
      let solcInputStringFromDeployment: string | undefined;
      try {
        solcInputStringFromDeployment = fs
          .readFileSync(path.join(solcInputsPath, solcInputHash + ".json"))
          .toString();
      } catch (e) {}
      if (!solcInputStringFromDeployment) {
        logError(
          `Contract ${name} was deployed without saving solcInput. Cannot submit to etherscan, skipping.`
        );
        return;
      }
      // TODO read file ?
      solcInput = JSON.parse(solcInputStringFromDeployment);
    } else {
      const settings = { ...metadata.settings };
      delete settings.compilationTarget;
      solcInput = {
        language: metadata.language,
        settings,
        sources: metadata.sources
      };
    }

    // Adding Libraries ....
    if (deployment.libraries) {
      const settings = solcInput.settings;
      settings.libraries = settings.libraries || {};
      for (const libraryName of Object.keys(deployment.libraries)) {
        if (!settings.libraries[contractNamePath]) {
          settings.libraries[contractNamePath] = {};
        }
        settings.libraries[contractNamePath][libraryName] =
          deployment.libraries[libraryName];
      }
    }
    const solcInputString = JSON.stringify(solcInput);

    logInfo(`verifying ${name} (${address}) ...`);

    let constructorArguements: string | undefined;
    if (deployment.args) {
      const constructor: { inputs: ParamType[] } = deployment.abi.find(
        v => v.type === "constructor"
      );
      if (constructor) {
        constructorArguements = defaultAbiCoder
          .encode(constructor.inputs, deployment.args)
          .slice(2);
      }
    } else {
      logInfo(`no args found, assuming empty constructor...`);
    }

    const postData: {
      [fieldName: string]: string | number | void | undefined; // TODO type
    } = {
      apikey: etherscanApiKey,
      module: "contract",
      action: "verifysourcecode",
      contractaddress: address,
      sourceCode: solcInputString,
      codeformat: "solidity-standard-json-input",
      contractname: contractNamePath,
      compilerversion: `v${metadata.compiler.version}`, // see http://etherscan.io/solcversions for list of support versions
      constructorArguements,
      licenseType
    };

    // Does not seem to work with solc-input ?
    // if (deployment.libraries) {
    //   let counter = 1;
    //   for (const libraryName of Object.keys(deployment.libraries)) {
    //     postData[`libraryname${counter}`] = libraryName;
    //     postData[`libraryaddress${counter}`] =
    //       deployment.libraries[libraryName];
    //     counter++;
    //   }
    // }

    const submissionResponse = await axios.request({
      url: `${host}/api`,
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      data: qs.stringify(postData)
    });
    const { data: submissionData } = submissionResponse;

    let guid: string;
    if (submissionData.status === "1") {
      guid = submissionData.result;
    } else {
      logError(
        `contract ${name} failed to submit : "${submissionData.message}"`,
        submissionData
      );
      return;
    }
    if (!guid) {
      logError(`contract submission for ${name} failed to return a guid`);
      return;
    }

    async function checkStatus(): Promise<string | undefined> {
      // TODO while loop and delay :
      const statusResponse = await axios.get(
        `${host}/api?apikey=${etherscanApiKey}`,
        {
          params: {
            guid,
            module: "contract",
            action: "checkverifystatus"
          }
        }
      );
      const { data: statusData } = statusResponse;
      if (statusData.status === "1") {
        return "success";
      }
      if (statusData.result === "Pending in queue") {
        return undefined;
      }
      logError(
        `Failed to verify contract ${name}: ${statusData.message}, ${statusData.result}`
      );

      logError(
        JSON.stringify(
          {
            apikey: "XXXXXX",
            module: "contract",
            action: "verifysourcecode",
            contractaddress: address,
            sourceCode: "...",
            codeformat: "solidity-standard-json-input",
            contractname: contractNamePath,
            compilerversion: `v${metadata.compiler.version}`, // see http://etherscan.io/solcversions for list of support versions
            constructorArguements,
            licenseType
          },
          null,
          "  "
        )
      );
      // logError(JSON.stringify(postData, null, "  "));
      // logInfo(postData.sourceCode);
      return "failure";
    }

    logInfo("waiting for result...");
    let result;
    while (!result) {
      await new Promise(resolve => setTimeout(resolve, 10 * 1000));
      result = await checkStatus();
    }

    if (result === "success") {
      logSuccess(` => contract ${name} is now verified`);
    }

    if (result === "failure") {
      if (!useSolcInput && fallbackOnSolcInput) {
        logInfo(
          "Falling back on solcInput. etherscan seems to sometime require full solc-input with all source files, even though this should not be needed"
        );
        await submit(name, true);
      } else {
        logInfo(
          "Etherscan sometime fails to verify when only metadata sources are givem, You can add the option --solc-input to try with full solc-input sources. This will include all contract source in the etherscan result, even the one not relevant to the contract being verified"
        );
      }
    }
  }

  for (const name of Object.keys(all)) {
    await submit(name);
  }
}
