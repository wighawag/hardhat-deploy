import {Interface as ContractInterface, ParamType} from 'ethers/lib/utils';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import {ABI, Deployment} from '../types';
import {deployments} from 'hardhat';
const {getNetworkName, getExtendedArtifact} = deployments;

interface IExplanation {
  errorsMissing: string[];
  eventsMissing: string[];
  functionsMissing: string[];
  functionsReturnedChanged: string[];
  functionsStateMutabilityChanged: string[];
}

interface IReport {
  explain: () => IExplanation;
  pass: boolean;
}

interface IValidateAllParams {
  write?: boolean;
  allowBreakingChanges?: boolean;
  dirname?: string;
}

interface IValidateParams extends IValidateAllParams {
  contractName: string;
  contractDeployment: Deployment;
}

const wrapWithParenthesis = (str: string) => {
  if (str.charAt(0) === '(' && str.charAt(str.length - 1) === ')') return str;
  return `(${str})`;
};

const checkIfErrorsMissing = (
  prevIface: ContractInterface,
  newIface: ContractInterface
) => {
  const missingErrors = [];
  for (const errorSelector in prevIface.errors) {
    if (!newIface.errors[errorSelector]) {
      missingErrors.push(errorSelector);
    }
  }
  return missingErrors;
};

const checkIfEventsMissing = (
  prevIface: ContractInterface,
  newIface: ContractInterface
) => {
  const missingEvents = [];
  for (const eventSelector in prevIface.events) {
    if (!newIface.events[eventSelector]) {
      missingEvents.push(eventSelector);
    }
  }
  return missingEvents;
};

const checkIfFunctionsMissing = (
  prevIface: ContractInterface,
  newIface: ContractInterface
) => {
  const missingFunctions = [];
  for (const functionSelector in prevIface.functions) {
    if (!newIface.functions[functionSelector]) {
      const newFunctionWithSameName = newIface.fragments.find((fragment) => {
        return fragment.name === prevIface.functions[functionSelector]?.name;
      });
      missingFunctions.push(
        `${functionSelector} --> ${
          newFunctionWithSameName?.format() || 'Not Found'
        }`
      );
    }
  }
  return missingFunctions;
};

const checkIfFunctionsReturnsChanged = (
  prevIface: ContractInterface,
  newIface: ContractInterface
) => {
  const functionsReturnedChanged = [];
  for (const functionSelector in prevIface.functions) {
    if (
      prevIface.functions[functionSelector].outputs?.length &&
      newIface.functions[functionSelector]
    ) {
      let index = 0;
      for (const output of prevIface.functions[functionSelector]
        .outputs as ParamType[]) {
        const newOutputs = newIface.functions[functionSelector]
          .outputs as ParamType[];
        if (newOutputs[index]?.format() !== output.format()) {
          functionsReturnedChanged.push(
            `${functionSelector}: ${wrapWithParenthesis(
              output.format()
            )} --> ${wrapWithParenthesis(output.format())}`
          );
        }
        index++;
      }
    }
  }
  return functionsReturnedChanged;
};

const checkIfFunctionsStateMutabilityChanged = (
  prevIface: ContractInterface,
  newIface: ContractInterface
) => {
  const stateMutabilityChanged = [];
  for (const functionSelector in prevIface.functions) {
    if (newIface.functions[functionSelector]) {
      if (
        newIface.functions[functionSelector].stateMutability !==
        prevIface.functions[functionSelector].stateMutability
      ) {
        stateMutabilityChanged.push(
          `${functionSelector}: ${prevIface.functions[functionSelector].stateMutability} --> ${newIface.functions[functionSelector].stateMutability}`
        );
      }
    }
  }
  return stateMutabilityChanged;
};
export const showReport = (
  errorsMissing: string[],
  eventsMissing: string[],
  functionsMissing: string[],
  functionsReturnedChanged: string[],
  functionsStateMutabilityChanged: string[]
): void => {
  const isIncompatible =
    errorsMissing.length ||
    eventsMissing.length ||
    functionsMissing.length ||
    functionsReturnedChanged.length ||
    functionsStateMutabilityChanged.length;
  if (isIncompatible) {
    console.error(chalk.red(`Incompatible Error`));
    if (errorsMissing.length) {
      console.error(
        chalk.red(`
------------------------
Errors selector changed:
${errorsMissing.join(`
`)}`)
      );
    }
    if (eventsMissing.length) {
      console.error(
        chalk.red(`
------------------------
Events selector changed:
${eventsMissing.join(`
`)}`)
      );
    }
    if (functionsMissing.length) {
      console.error(
        chalk.red(`
------------------------
Functions selector changed:
${functionsMissing.join(`
`)}`)
      );
    }
    if (functionsReturnedChanged.length) {
      console.error(
        chalk.red(`
------------------------
Functions returned types changed:
${functionsReturnedChanged.join(`
`)}`)
      );
    }
    if (functionsStateMutabilityChanged.length) {
      console.error(
        chalk.red(`
------------------------
Functions state mutability changed:
${functionsStateMutabilityChanged.join(`
`)}`)
      );
    }
  } else {
    console.debug(
      chalk.green('detected no incompatible (breaking) changes to ABI')
    );
  }
};

export const toJsonFile = (
  contractName: string,
  dir: fs.PathLike,
  report: IReport
): void => {
  // markdOWN
  if (report.pass) {
    // just print that everything is OK
  } else {
    const data = {
      isCompatible: report.pass,
      changes: {
        'errors-selector-changed': [] as string[],
        'events-selector-changed': [] as string[],
        'functions-selector-changed': [] as string[],
        'functions-returned-types-changed': [] as string[],
        'function-state_mutability-changed': [] as string[],
      },
    };
    const reportDetails = report.explain();
    data.changes['errors-selector-changed'] = reportDetails.errorsMissing;
    data.changes['events-selector-changed'] = reportDetails.eventsMissing;
    data.changes['functions-selector-changed'] = reportDetails.functionsMissing;
    data.changes['functions-returned-types-changed'] =
      reportDetails.functionsReturnedChanged;
    data.changes['function-state_mutability-changed'] =
      reportDetails.functionsStateMutabilityChanged;

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, {
        recursive: true,
      });
    }
    const jsonData = JSON.stringify(data, null, 2);
    fs.writeFileSync(
      // path.join(__dirname, `../deployments/${network}/abiCompatibility/`, `${contractName}.json`),
      path.join(dir.toString(), `${contractName}.json`),
      jsonData
    );
  }
};

export const getAbiCompatibilityReport = async (
  prevAbi: ABI,
  newAbi: ABI
): Promise<IReport> => {
  const prevIface = new ContractInterface(prevAbi);
  const newIface = new ContractInterface(newAbi);

  const errorsMissing = checkIfErrorsMissing(prevIface, newIface);
  const eventsMissing = checkIfEventsMissing(prevIface, newIface);
  const functionsMissing = checkIfFunctionsMissing(prevIface, newIface);
  const functionsReturnedChanged = checkIfFunctionsReturnsChanged(
    prevIface,
    newIface
  );
  const functionsStateMutabilityChanged =
    checkIfFunctionsStateMutabilityChanged(prevIface, newIface);

  showReport(
    errorsMissing,
    eventsMissing,
    functionsMissing,
    functionsReturnedChanged,
    functionsStateMutabilityChanged
  );
  const pass =
    !errorsMissing.length &&
    !eventsMissing.length &&
    !functionsMissing.length &&
    !functionsReturnedChanged.length &&
    !functionsStateMutabilityChanged.length;

  return {
    explain: () => {
      return {
        errorsMissing,
        eventsMissing,
        functionsMissing,
        functionsReturnedChanged,
        functionsStateMutabilityChanged,
      };
    },
    pass,
  };
};

export async function validateAbiCompatibility({
  contractName,
  contractDeployment,
  write,
  dirname,
}: IValidateParams): Promise<boolean> {
  console.log(
    `checking ABI compatability for ${contractName} on ${getNetworkName()}`
  );
  const {abi} = await getExtendedArtifact(contractName);
  const report = await getAbiCompatibilityReport(contractDeployment.abi, abi);
  if (write && dirname) {
    const abiCompatDir = path.join(
      dirname,
      getNetworkName(),
      'abi_compatibility'
    );
    toJsonFile(contractName, abiCompatDir, report);
  }
  return report.pass;
}

export const validateAbiCompatibilityForAllContracts: (
  params: IValidateAllParams
) => Promise<boolean> = async ({allowBreakingChanges, write, dirname}) => {
  let isContractsIncompatible = false;
  const allDeployedContracts = Object.entries(await deployments.all());
  console.log(`checking ABI compatability for all deployed contracts`);
  for (const [contractName, contractDeployment] of allDeployedContracts) {
    const isContractIncompatible = await validateAbiCompatibility({
      contractName,
      contractDeployment,
      dirname,
      write,
    });
    if (!isContractsIncompatible) {
      isContractsIncompatible = isContractIncompatible;
    }
  }
  if (!allowBreakingChanges && isContractsIncompatible) {
    throw new Error('Abi is is incompatible');
  }
  return !isContractsIncompatible;
};
