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
  etherscanApiKey?: string,
  license?: string
) {
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
    return logError(
      `license :"${license}" not supported by etherscan, list of supported license can be found here : https://etherscan.io/contract-license-types . This tool expect the SPDX id, except for "None" and "Unlicense"`
    );
  })();

  for (const name of Object.keys(all)) {
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
        continue;
      }
    }
    if (contractABI && contractABI !== "") {
      log(`already verified: ${name} (${address}), skipping.`);
      continue;
    }
    if (!metadataString) {
      logError(
        `Contract ${name} was deployed without saving metadata. Cannot submit to etherscan, skipping.`
      );
      continue;
    }
    const metadata = JSON.parse(metadataString);
    const settings = { ...metadata.settings };
    delete settings.compilationTarget;
    const solcInputString = JSON.stringify({
      language: metadata.language,
      settings,
      sources: metadata.sources
    });
    logInfo(`verifying ${name} (${address}) ...`);

    let contractNamePath;
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
        continue;
      }
      process.stdout.write(chalk.green(` found\n`));
      // console.error(`contractName is missing for ${name}`);
      // continue;
    }

    let constructorArguements;
    if (deployment.args) {
      const constructor: { inputs: ParamType[] } = deployment.abi.find(
        v => v.type === "constructor"
      );
      constructorArguements = defaultAbiCoder
        .encode(constructor.inputs, deployment.args)
        .slice(2);
    } else {
      logInfo(`no args found, assuming empty constructor...`);
    }

    const submissionResponse = await axios.request({
      url: `${host}/api`,
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      data: qs.stringify({
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
        // TODO libraries
        // libraryname1: $("#libraryname1").val(), //if applicable, a matching pair with libraryaddress1 required
        // libraryaddress1: $("#libraryaddress1").val(), //if applicable, a matching pair with libraryname1 required
        // libraryname2: $("#libraryname2").val(), //if applicable, matching pair required
        // libraryaddress2: $("#libraryaddress2").val(), //if applicable, matching pair required
        // libraryname3: $("#libraryname3").val(), //if applicable, matching pair required
        // libraryaddress3: $("#libraryaddress3").val(), //if applicable, matching pair required
        // libraryname4: $("#libraryname4").val(), //if applicable, matching pair required
        // libraryaddress4: $("#libraryaddress4").val(), //if applicable, matching pair required
        // libraryname5: $("#libraryname5").val(), //if applicable, matching pair required
        // libraryaddress5: $("#libraryaddress5").val(), //if applicable, matching pair required
        // libraryname6: $("#libraryname6").val(), //if applicable, matching pair required
        // libraryaddress6: $("#libraryaddress6").val(), //if applicable, matching pair required
        // libraryname7: $("#libraryname7").val(), //if applicable, matching pair required
        // libraryaddress7: $("#libraryaddress7").val(), //if applicable, matching pair required
        // libraryname8: $("#libraryname8").val(), //if applicable, matching pair required
        // libraryaddress8: $("#libraryaddress8").val(), //if applicable, matching pair required
        // libraryname9: $("#libraryname9").val(), //if applicable, matching pair required
        // libraryaddress9: $("#libraryaddress9").val(), //if applicable, matching pair required
        // libraryname10: $("#libraryname10").val(), //if applicable, matching pair required
        // libraryaddress10: $("#libraryaddress10").val() //if applicable, matching pair required
      })
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
      continue;
    }
    if (!guid) {
      logError(`contract submission for ${name} failed to return a guid`);
      continue;
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
    return;
  }
}
