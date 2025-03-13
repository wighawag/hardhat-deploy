import {configVariable} from 'hardhat/config';
import {
	EdrNetworkAccountConfig,
	EdrNetworkAccountUserConfig,
	EdrNetworkHDAccountsUserConfig,
	EdrNetworkUserConfig,
	HttpNetworkHDAccountsUserConfig,
	HttpNetworkUserConfig,
	NetworkUserConfig,
	SensitiveString,
} from 'hardhat/types/config';
import {HardhatRuntimeEnvironment} from 'hardhat/types/hre';
import {Environment, ProvidedContext, UnknownArtifacts, UnresolvedUnknownNamedAccounts, loadEnvironment} from 'rocketh';

export async function loadEnvironmentFromHardhat<
	Artifacts extends UnknownArtifacts = UnknownArtifacts,
	NamedAccounts extends UnresolvedUnknownNamedAccounts = UnresolvedUnknownNamedAccounts
>(
	{hre, context}: {hre: HardhatRuntimeEnvironment; context?: ProvidedContext<Artifacts, NamedAccounts>},
	options?: {
		useChainIdOfForkedNetwork?: boolean;
	}
): Promise<Environment> {
	const connection = await hre.network.connect();
	let provider: any = connection.provider;
	let network: string | {fork: string} = connection.networkName;
	let forkChainId: number | undefined;
	const fork = process.env.HARDHAT_FORK as string | undefined;
	if (fork) {
		if (options?.useChainIdOfForkedNetwork) {
			const forkNetworkConfig = hre.config.networks[fork];

			if (forkNetworkConfig.type === 'edr') {
				forkChainId = forkNetworkConfig.chainId;
			} else if (forkNetworkConfig.chainId) {
				forkChainId = forkNetworkConfig.chainId;
			} else {
				if ('url' in forkNetworkConfig) {
					const url = await forkNetworkConfig.url.getUrl();
					const response = await fetch(url, {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
						},
						body: JSON.stringify({
							jsonrpc: '2.0',
							id: 1,
							method: 'eth_chainId',
							params: [],
						}),
					});
					const json = (await response.json()) as {result: string};
					forkChainId = Number(json.result);
				} else {
					throw new Error(`cannot fetch chainId`);
				}
			}
		}

		network = {
			fork,
		};
	}

	if (forkChainId) {
		const originalProvider = provider;
		const chainId = forkChainId;
		async function request(args: {method: string; params?: string[]}): Promise<any> {
			if (args.method === 'eth_chainId') {
				return `0x${chainId.toString(16)}`;
			}
			return originalProvider.request(args);
		}
		provider = new Proxy(originalProvider, {
			get: function (target, property, receiver) {
				switch (property) {
					case 'request':
						return request;
					default:
						return originalProvider[property];
				}
			},
		});
	}

	console.log(`loading environments...`);
	return loadEnvironment(
		{
			provider,
			network,
		},
		context || {artifacts: {} as any} // TODO
	);
}

export function getRPC(networkName: string): string | SensitiveString | undefined {
	const variableName = 'ETH_NODE_URI_' + networkName;
	let uri = process.env[variableName];
	if (uri === 'SECRET') {
		return configVariable(`SECRET_${variableName}`);
	}
	if (uri && uri !== '') {
		return uri;
	}

	uri = process.env.ETH_NODE_URI;
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

export function getMnemonic(networkName?: string): string | SensitiveString {
	if (networkName) {
		const variableName = 'MNEMONIC_' + networkName;
		const mnemonic = process.env[variableName];
		if (mnemonic === 'SECRET') {
			return configVariable(`SECRET_${variableName}`);
		}
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

export function getAccounts(networkName?: string): {mnemonic: string | SensitiveString} {
	return {mnemonic: getMnemonic(networkName)};
}

export function addNetworksFromEnv(networks?: Record<string, EdrNetworkUserConfig>): Record<string, NetworkUserConfig> {
	const newNetworks: Record<string, NetworkUserConfig> = networks ? {...networks} : {};
	const allEnv = Object.keys(process.env);
	for (const envKey of allEnv) {
		if (envKey.startsWith(`ETH_NODE_URI_`) && envKey.length > `ETH_NODE_URI_`.length) {
			const networkName = envKey.slice(`ETH_NODE_URI_`.length);
			const url = getRPC(networkName);
			if (!newNetworks[networkName]) {
				if (url) {
					newNetworks[networkName] = {
						type: 'http',
						url,
						accounts: getAccounts(networkName),
					};
				} else {
					console.error(`no url for network ${networkName}`);
				}
			} else {
				console.error(`duplicated network ${networkName}`);
			}
		}
	}
	return newNetworks;
}

export function populateNetworksFromEnv(
	networks: Record<string, Omit<NetworkUserConfig, 'accounts' | 'url'> | EdrNetworkUserConfig>
): Record<string, NetworkUserConfig> {
	const newNetworks: Record<string, NetworkUserConfig> = {};
	for (const networkName of Object.keys(networks)) {
		const network = networks[networkName];
		if (network.type === 'edr') {
			// we leave memory network alone
			newNetworks[networkName] = network as EdrNetworkUserConfig;
		} else {
			const url = getRPC(networkName);
			if (url) {
				newNetworks[networkName] = {
					...network,
					url,
					accounts: getAccounts(networkName),
				};
			} else {
				if (!('url' in network) || !network.url) {
					console.error(`no url for network ${networkName}`);
				}
			}
		}
	}
	return newNetworks;
}

export function addForkConfiguration(networks: Record<string, NetworkUserConfig>): Record<string, NetworkUserConfig> {
	const currentNetworkName = process.env.HARDHAT_FORK;
	let forkURL: SensitiveString | string | undefined;
	let hardhatAccounts: EdrNetworkHDAccountsUserConfig | undefined;
	if (
		currentNetworkName &&
		currentNetworkName !== 'hardhat' &&
		currentNetworkName !== 'edr' &&
		currentNetworkName !== 'memory'
	) {
		const currentNetwork = networks[currentNetworkName] as HttpNetworkUserConfig;
		if (currentNetwork) {
			if (currentNetwork.type === 'http') {
				forkURL = currentNetwork.url;
				if (
					currentNetwork.accounts &&
					typeof currentNetwork.accounts === 'object' &&
					'mnemonic' in currentNetwork.accounts
				) {
					hardhatAccounts = currentNetwork.accounts;
				}

				// else if (currentNetwork.accounts && Array.isArray(currentNetwork.accounts)) {
				// 	hardhatAccounts = currentNetwork.accounts.map((v) => ({
				// 		balance: '10000000000000000000000',
				// 		privateKey: v,
				// 	}));
				// }
			}
		}
	}

	const existingHardhat: EdrNetworkUserConfig =
		networks.hardhat && networks.hardhat.type === 'edr' ? networks.hardhat : {type: 'edr', chainType: 'l1'};

	const newNetworks: Record<string, NetworkUserConfig> = {
		...populateNetworksFromEnv(networks),
		hardhat: {
			...existingHardhat,
			...{
				accounts: hardhatAccounts || existingHardhat?.accounts,
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
