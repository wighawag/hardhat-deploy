import {HDAccountsUserConfig, HttpNetworkUserConfig, NetworksUserConfig} from 'hardhat/types';
export function getRPC(networkName: string): string | undefined {
	if (networkName) {
		const uri = process.env['ETH_NODE_URI_' + networkName];
		if (uri && uri !== '') {
			return uri;
		}
	}

	let uri = process.env.ETH_NODE_URI;
	if (uri) {
		uri = uri.replace('{{networkName}}', networkName);
	}
	if (!uri || uri === '') {
		if (networkName === 'localhost') {
			return 'http://localhost:8545';
		}
		return uri;
		// throw new Error(`no uri specified or for network ${networkName}`);
	}
	if (uri.indexOf('{{') >= 0) {
		throw new Error(`invalid uri or network not supported by node provider : ${uri}`);
	}

	return uri;
}

export function getMnemonic(networkName?: string): string {
	if (networkName) {
		const mnemonic = process.env['MNEMONIC_' + networkName];
		if (mnemonic && mnemonic !== '') {
			return mnemonic;
		}
	}

	const mnemonic = process.env.MNEMONIC;
	if (!mnemonic || mnemonic === '') {
		return 'test test test test test test test test test test test junk';
	}
	return mnemonic;
}

export function getAccounts(networkName?: string): {mnemonic: string} {
	return {mnemonic: getMnemonic(networkName)};
}

export function addNetworksFromEnv(networks?: Omit<NetworksUserConfig, 'url' | 'accounts'>) {
	const newNetworks: NetworksUserConfig = networks ? {...networks} : {};
	const allEnv = Object.keys(process.env);
	for (const envKey of allEnv) {
		if (envKey.startsWith(`ETH_NODE_URI_`) && envKey.length > `ETH_NODE_URI_`.length) {
			const name = envKey.slice(`ETH_NODE_URI_`.length);
			if (!newNetworks[name]) {
				newNetworks[name] = {
					url: getRPC(name),
					accounts: getAccounts(name),
				};
			}
		}
	}
	return newNetworks;
}

export function populateNetworksFromEnv(networks: Omit<NetworksUserConfig, 'url' | 'accounts'>): NetworksUserConfig {
	const newNetworks: NetworksUserConfig = {};
	for (const networkName of Object.keys(networks)) {
		if (networkName === 'hardhat') {
			continue;
		}
		newNetworks[networkName] = {
			...networks[networkName],
			url: getRPC(networkName),
			accounts: getAccounts(networkName),
		};
	}
	return newNetworks;
}

export function addForkConfiguration(networks: NetworksUserConfig): NetworksUserConfig {
	const currentNetworkName = process.env.HARDHAT_FORK;
	let forkURL: string | undefined;
	let hardhatAccounts: HDAccountsUserConfig | undefined;
	if (currentNetworkName && currentNetworkName !== 'hardhat') {
		const currentNetwork = networks[currentNetworkName] as HttpNetworkUserConfig;
		if (currentNetwork) {
			forkURL = currentNetwork.url;
			if (
				currentNetwork.accounts &&
				typeof currentNetwork.accounts === 'object' &&
				'mnemonic' in currentNetwork.accounts
			) {
				hardhatAccounts = currentNetwork.accounts;
			}
		}
	}

	const newNetworks = {
		...populateNetworksFromEnv(networks),
		hardhat: {
			...networks.hardhat,
			...{
				accounts: hardhatAccounts || networks.hardhat?.accounts,
				forking: forkURL
					? {
							url: forkURL,
							blockNumber: process.env.HARDHAT_FORK_NUMBER ? parseInt(process.env.HARDHAT_FORK_NUMBER) : undefined,
					  }
					: undefined,
			},
		},
	};
	return newNetworks;
}
