import {BigNumber} from '@ethersproject/bignumber';
import {bnReplacer} from './internal/utils';

export class UnknownSignerError extends Error {
  constructor(
    public data: {
      from: string;
      to?: string;
      data?: string;
      value?: string | BigNumber;
      contract?: {name: string; method: string; args: unknown[]};
    }
  ) {
    super(
      `Unknown Signer for account: ${
        data.from
      } Trying to execute the following::\n ${JSON.stringify(
        data,
        bnReplacer,
        '  '
      )}`
    );
    Error.captureStackTrace(this, UnknownSignerError);
  }
}
