import {Interface as ContractInterface, ParamType} from 'ethers/lib/utils';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';
import {ABI} from '../types';

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

export interface IContractDetails {
  contractName: string;
  prevAbi: ABI;
  newAbi: ABI;
}
interface IValidateParams {
  write: boolean;
  allowBreakingChanges?: boolean;
  dirname: string;
  networkName: string;
  contracts: IContractDetails[];
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

export const getAbiCompatibilityReport = (
  prevAbi: ABI,
  newAbi: ABI
): IReport => {
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

export const validateAbiCompatibility: (params: IValidateParams) => boolean = ({
  allowBreakingChanges,
  write,
  dirname,
  networkName,
  contracts,
}) => {
  let isIncompatible = false;
  for (const {contractName, prevAbi, newAbi} of contracts) {
    console.log(
      `checking ABI compatability for ${contractName} on ${networkName}`
    );
    if (prevAbi && newAbi) {
      const report = getAbiCompatibilityReport(prevAbi, newAbi);
      if (write && dirname && networkName) {
        const abiCompatDir = path.join(
          dirname,
          networkName,
          'abi_compatibility'
        );
        toJsonFile(contractName, abiCompatDir, report);
      }
      isIncompatible = isIncompatible || !report.pass;
    }
  }
  if (!allowBreakingChanges && isIncompatible) {
    throw new Error('Abi is incompatible');
  }
  return !isIncompatible;
};
