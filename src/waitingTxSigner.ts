import {providers, Signer} from 'ethers';
import {Deferrable} from 'ethers/lib/utils';
import {
  TransactionResponse,
  TransactionRequest,
} from '@ethersproject/abstract-provider';
import {prompt} from 'enquirer';

export class WaitingTxSigner extends Signer {
  constructor(
    protected from: string,
    protected provider: providers.BaseProvider
  ) {}
  async sendTransaction(
    transaction: Deferrable<TransactionRequest>
  ): Promise<TransactionResponse> {
    const response: {hash: string} = await prompt({
      type: 'input',
      name: 'hash',
      message: 'tx hash',
    });

    return this.provider.getTransaction(response.hash);
  }
}
