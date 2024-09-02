import { EIP712Signer, Provider, Signer, Wallet } from 'zksync-ethers';
import { TransactionRequest, TransactionResponse } from 'zksync-ethers/build/types';
import { EIP712_TX_TYPE, isAddressEq, serialize } from 'zksync-ethers/build/utils';
import { ethers } from 'ethers';
import { findWalletFromAddress, isImpersonatedSigner } from './utils';
import { HardhatZksyncProvider } from './hardhat-zksync-provider';
import { richWallets } from './rich-wallets';
import { LOCAL_CHAIN_IDS_ENUM } from './constants';
import { HardhatZksyncEIP712Signer } from './hardhat-zksync-eip712-signer';

export class HardhatZksyncSigner extends Signer {
    private accountWallet?: Wallet | HardhatZksyncEIP712Signer | undefined;

    public static from(
        signer: ethers.providers.JsonRpcSigner & { provider: HardhatZksyncProvider },
        zksyncProvider?: Provider | HardhatZksyncProvider,
    ): HardhatZksyncSigner {
        const newSigner: Signer = super.from(signer, zksyncProvider);
        const hardhatZksyncSigner: HardhatZksyncSigner = Object.setPrototypeOf(
            newSigner,
            HardhatZksyncSigner.prototype,
        );
        return hardhatZksyncSigner;
    }

    public async sendTransaction(transaction: TransactionRequest): Promise<TransactionResponse> {
        if (!this.accountWallet) {
            this.accountWallet = await HardhatZksyncSigner._getProperSigner(
                (this.provider as HardhatZksyncProvider),
                this._address,
            );
        }

        const address = await this.getAddress();
        const from = !transaction.from ? address : ethers.utils.getAddress(transaction.from);

        if (!isAddressEq(from, address)) {
            throw new Error('Transaction `from` address mismatch!');
        }

        transaction.from = from;

        if (!this.accountWallet) {
            throw new Error(`Account ${from} is not managed by the node you are connected to.`);
        }

        if (this.accountWallet instanceof EIP712Signer) {
            return this._sendTransaction(transaction);
        }

        return this.accountWallet.sendTransaction(transaction);
    }

    public async signMessage(message: string | Uint8Array): Promise<string> {
        if (!this.accountWallet) {
            this.accountWallet = await HardhatZksyncSigner._getProperSigner(
                (this.provider as HardhatZksyncProvider),
                this._address,
            );
        }

        if (!this.accountWallet) {
            throw new Error(`Account ${this._address} is not managed by the node you are connected to.`);
        }

        return this.accountWallet.signMessage(message);
    }

    public async _signTypedData(
        domain: ethers.TypedDataDomain,
        types: Record<string, ethers.TypedDataField[]>,
        value: Record<string, any>,
    ): Promise<string> {
        if (!this.accountWallet) {
            this.accountWallet = await HardhatZksyncSigner._getProperSigner(
                (this.provider as HardhatZksyncProvider),
                this._address,
            );
        }

        if (!this.accountWallet) {
            throw new Error(`Account ${this._address} is not managed by the node you are connected to.`);
        }

        return this.accountWallet._signTypedData(domain, types, value);
    }

    public async signTransaction(transaction: TransactionRequest): Promise<string> {
        if (!this.accountWallet) {
            this.accountWallet = await HardhatZksyncSigner._getProperSigner(
                (this.provider as HardhatZksyncProvider),
                this._address,
            );
        }

        if (!this.accountWallet) {
            throw new Error(`Account ${this._address} is not managed by the node you are connected to.`);
        }
        const tx = await this._prepareTransaction(transaction);
        return this.accountWallet.signTransaction(tx);
    }

    private async _sendTransaction(transaction: TransactionRequest): Promise<TransactionResponse> {
        const tx = await this._prepareTransaction(transaction);
        tx.customData = tx.customData || {};
        tx.customData.customSignature = await (this.accountWallet as EIP712Signer).sign(transaction);

        const txBytes = serialize(tx);
        return await this.provider.sendTransaction(txBytes);
    }

    private async _prepareTransaction(transaction: TransactionRequest): Promise<TransactionRequest> {
        if (!transaction.customData && !transaction.type) {
            // use legacy txs by default
            transaction.type = 0;
        }
        if (!transaction.customData && transaction.type !== EIP712_TX_TYPE) {
            return (await super.populateTransaction(transaction)) as TransactionRequest;
        }

        const address = await this.getAddress();
        transaction.from ??= address;
        if (!isAddressEq(transaction.from, address)) {
            throw new Error('Transaction `from` address mismatch!');
        }
        transaction.type = EIP712_TX_TYPE;
        transaction.value ??= 0;
        transaction.data ??= '0x';
        transaction.nonce ??= await this.getNonce();
        transaction.customData = this._fillCustomData(transaction.customData ?? {});
        transaction.gasPrice ??= await this.provider.getGasPrice();
        transaction.gasLimit ??= await this.provider.estimateGas(transaction);
        transaction.chainId ??= (await this.provider.getNetwork()).chainId;

        return transaction;
    }

    private static async _getProperSigner(
        provider: HardhatZksyncProvider,
        address: string,
    ): Promise<Wallet | HardhatZksyncEIP712Signer | undefined> {
        let signer: Wallet | HardhatZksyncEIP712Signer | undefined = await findWalletFromAddress(address, provider.hardhatNetwork, provider);
        if (!signer && (await isImpersonatedSigner(provider, address))) {
            signer = new HardhatZksyncEIP712Signer(
                new Wallet(richWallets[LOCAL_CHAIN_IDS_ENUM.ERA_NODE][0].privateKey),
                provider.getNetwork().then((n) => Number(n.chainId)),
            );
        }

        return signer;
    }
}