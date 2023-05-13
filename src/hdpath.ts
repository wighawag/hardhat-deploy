/* eslint-disable @typescript-eslint/no-explicit-any */
import chalk from 'chalk';

function logError(...args: any[]) {
  console.log(chalk.red(...args));
}

export function getDerivationPath(chainId: number): string | undefined {
  let coinType;

  switch (chainId) {
    case 1:
    case 2020 /* Ronin Mainnet */:
    case 2021 /* Ronin Testnet */:
      coinType = '60';
      break;
    case 3:
    case 4:
    case 5:
      coinType = '1';
      break;
    default:
      logError(`Network with chainId: ${chainId} not supported.`);
      return undefined;
  }

  const derivationPath = `m/44'/${coinType}'/0'/0`;
  return derivationPath;
}
