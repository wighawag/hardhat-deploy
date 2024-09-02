import {
    HardhatNetworkAccountsConfig,
    HardhatNetworkHDAccountsConfig,
    HttpNetworkAccountsConfig,
    Network,
} from 'hardhat/types';
import { Provider, Wallet } from 'zksync-ethers';
import {
    LOCAL_CHAIN_IDS,
    LOCAL_CHAIN_IDS_ENUM,
    LOCAL_CHAINS_WITH_IMPERSONATION,
} from './constants';
import { richWallets } from './rich-wallets';
import { isAddressEq } from 'zksync-ethers/build/utils';

export async function getWallet(network: Network, provider: Provider, privateKeyOrIndex?: string | number): Promise<Wallet> {
    const privateKey = isString(privateKeyOrIndex) ? (privateKeyOrIndex as string) : undefined;
    const accountNumber = isNumber(privateKeyOrIndex) ? (privateKeyOrIndex as number) : undefined;

    if (privateKey) {
        return new Wallet(privateKey, provider);
    }

    const accounts = network.config.accounts;

    const wallets = await getWalletsFromAccount(network, provider, accounts);

    if (accountNumber && accountNumber >= wallets.length) {
        throw new Error('Account private key with specified index is not found');
    }

    if (wallets.length === 0) {
        throw new Error('Accounts are not configured for this network');
    }

    return wallets[accountNumber || 0];
}

export async function getWallets(network: Network, provider: Provider): Promise<Wallet[]> {
    const accounts = network.config.accounts;

    return await getWalletsFromAccount(network, provider, accounts);
}

export function isHardhatNetworkHDAccountsConfig(object: any): object is HardhatNetworkHDAccountsConfig {
    return 'mnemonic' in object;
}

export function isHardhatNetworkAccountsConfigStrings(object: any): object is string[] {
    return typeof object[0] === 'string';
}

export function isString(object: any): object is string {
    return typeof object === 'string';
}

export function isNumber(object: any): object is number {
    return typeof object === 'number';
}

export async function getWalletsFromAccount(
    network: Network,
    provider: Provider,
    accounts: HardhatNetworkAccountsConfig | HttpNetworkAccountsConfig,
): Promise<Wallet[]> {
    if (!accounts || accounts === 'remote') {
        return await getRichWalletsIfPossible(provider);
    }

    if (isHardhatNetworkAccountsConfigStrings(accounts)) {
        const accountPrivateKeys = accounts as string[];

        const wallets = accountPrivateKeys.map((accountPrivateKey) =>
            new Wallet(accountPrivateKey, provider),
        );
        return wallets;
    }

    if (isHardhatNetworkHDAccountsConfig(accounts)) {
        const account = accounts as HardhatNetworkHDAccountsConfig;

        const wallet = Wallet.fromMnemonic(account.mnemonic)
            .connect(provider)
        return [wallet];
    }

    return [];
}

export async function findWalletFromAddress(
    address: string,
    network: Network,
    provider: Provider,
    wallets?: Wallet[],
): Promise<Wallet | undefined> {
    if (!network) {
        throw new Error('Hardhat network is required to find wallet from address');
    }

    if (!wallets) {
        wallets = await getWallets(network, provider);
    }
    return wallets.find((w) => isAddressEq(w.address, address));
}

export async function getSignerAccounts(network: Network, provider: Provider): Promise<string[]> {
    const accounts: [] = await network.provider.send('eth_accounts', []);

    if (!accounts || accounts.length === 0) {
        const wallets = await getWallets(network, provider);
        return wallets.map((w) => w.address);
    }

    const allWallets = await getWallets(network, provider);

    return accounts.filter((account: string) => allWallets.some((wallet) => isAddressEq(wallet.address, account)));
}

export async function getRichWalletsIfPossible(provider: Provider): Promise<Wallet[]> {
    const chainId = await provider.send('eth_chainId', []);
    if (LOCAL_CHAIN_IDS.includes(chainId)) {
        const chainIdEnum = chainId as LOCAL_CHAIN_IDS_ENUM;

        return richWallets[chainIdEnum].map((wallet) =>
            new Wallet(wallet.privateKey, provider),
        );
    }
    return [];
}

export async function isImpersonatedSigner(provider: Provider, address: string): Promise<boolean> {
    const chainId = await provider.send('eth_chainId', []);

    if (!LOCAL_CHAINS_WITH_IMPERSONATION.includes(chainId)) {
        return false;
    }

    const result = await provider.send('hardhat_stopImpersonatingAccount', [address]);

    if (!result) {
        return false;
    }

    await provider.send('hardhat_impersonateAccount', [address]);
    return true;
}