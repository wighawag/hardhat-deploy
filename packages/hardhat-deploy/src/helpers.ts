import {configVariable} from 'hardhat/config';
import {
	EdrNetworkHDAccountsUserConfig,
	EdrNetworkUserConfig,
	HttpNetworkUserConfig,
	NetworkUserConfig,
	SensitiveString,
} from 'hardhat/types/config';
import {HardhatRuntimeEnvironment} from 'hardhat/types/hre';
import {NetworkConnection} from 'hardhat/types/network';
import {
	Environment,
	UnresolvedUnknownNamedAccounts,
	UnresolvedNetworkSpecificData,
	loadEnvironment,
	enhanceEnvIfNeeded,
	chainByCanonicalName,
} from 'rocketh';

export function setupHardhatDeploy<
	Extensions extends Record<string, (env: Environment<any, any, any>) => any> = {},
	NamedAccounts extends UnresolvedUnknownNamedAccounts = UnresolvedUnknownNamedAccounts,
	Data extends UnresolvedNetworkSpecificData = UnresolvedNetworkSpecificData
>(extensions: Extensions) {
	async function loadEnvironmentFromHardhatWithExtensions(
		required: {hre: HardhatRuntimeEnvironment; connection?: NetworkConnection}
		// options?: {
		// 	useChainIdOfForkedNetwork?: boolean;
		// }
	) {
		const env = await loadEnvironmentFromHardhat<NamedAccounts, Data>(required);
		return enhanceEnvIfNeeded(env, extensions);
	}

	return {
		loadEnvironmentFromHardhat: loadEnvironmentFromHardhatWithExtensions,
	};
}

export async function generateForkConfig(
	params: {hre: HardhatRuntimeEnvironment; connection?: NetworkConnection}
	// options?: {
	// 	useChainIdOfForkedNetwork?: boolean;
	// }
): Promise<{provider: any; environment: string | {fork: string}; connection: NetworkConnection; isFork: boolean}> {
	const fork = process.env.HARDHAT_FORK as string | undefined;

	const connection =
		params.connection || fork
			? await params.hre.network.connect({network: 'fork'})
			: await params.hre.network.connect();

	let provider: any = connection.provider;
	let environment: string | {fork: string} = connection.networkName;
	let forkChainId: number | undefined;

	if (fork) {
		// if (options?.useChainIdOfForkedNetwork) {
		// 	const forkNetworkConfig = params.hre.config.networks[fork];

		// 	if (forkNetworkConfig.type === 'edr-simulated') {
		// 		forkChainId = forkNetworkConfig.chainId;
		// 	} else if (forkNetworkConfig.chainId) {
		// 		forkChainId = forkNetworkConfig.chainId;
		// 	} else {
		// 		if ('url' in forkNetworkConfig) {
		// 			const url = await forkNetworkConfig.url.getUrl();
		// 			const response = await fetch(url, {
		// 				method: 'POST',
		// 				headers: {
		// 					'Content-Type': 'application/json',
		// 				},
		// 				body: JSON.stringify({
		// 					jsonrpc: '2.0',
		// 					id: 1,
		// 					method: 'eth_chainId',
		// 					params: [],
		// 				}),
		// 			});
		// 			const json = (await response.json()) as {result: string};
		// 			forkChainId = Number(json.result);
		// 		} else {
		// 			throw new Error(`cannot fetch chainId`);
		// 		}
		// 	}
		// }

		environment = {
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

	return {provider, environment, connection, isFork: !!fork};
}

export async function loadEnvironmentFromHardhat<
	NamedAccounts extends UnresolvedUnknownNamedAccounts = UnresolvedUnknownNamedAccounts,
	Data extends UnresolvedNetworkSpecificData = UnresolvedNetworkSpecificData
>(
	params: {hre: HardhatRuntimeEnvironment; connection?: NetworkConnection}
	// TODO ?
	// options?: {
	// 	useChainIdOfForkedNetwork?: boolean;
	// }
): Promise<Environment<NamedAccounts, Data>> {
	const {connection, environment, provider, isFork} = await generateForkConfig(params);
	// console.log(`loading environments...`);
	return loadEnvironment<NamedAccounts, Data>({
		provider,
		environment,
		extra: {
			connection,
		},
		saveDeployments: isFork ? false : undefined,
	});
}

function getVariable(prefix: string, name: string): string | SensitiveString | undefined {
	// We transform dash into underscore as dash are not supported everywhere in env var names
	const variableName = (prefix + name).replaceAll('-', '_');
	let uri = process.env[variableName];
	if (uri === 'SECRET') {
		return configVariable(`SECRET_${variableName}`);
	} else if (uri?.startsWith('SECRET:')) {
		const splitted = uri.split(':');
		if (splitted.length !== 2) {
			throw new Error(`invalid secret uri ${uri}`);
		}
		return configVariable(`SECRET_${prefix + splitted[1]}`);
	}
	return uri;
}

export function getRPC(networkName: string): string | SensitiveString | undefined {
	let uri = getVariable('ETH_NODE_URI_', networkName);

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

export function getMnemonic(networkName?: string, doNotDefault?: boolean): string | SensitiveString | undefined {
	if (networkName) {
		const mnemonic = getVariable('MNEMONIC_', networkName);

		if (mnemonic && mnemonic !== '') {
			return mnemonic;
		}
	}

	const mnemonic = process.env.MNEMONIC;
	if (!mnemonic || mnemonic === '') {
		if (doNotDefault) {
			return undefined;
		}
		return 'test test test test test test test test test test test junk';
	}
	return mnemonic;
}

export function getAccounts(
	networkName?: string,
	doNotDefault?: boolean
): {mnemonic: string | SensitiveString} | undefined {
	const mnemonic = getMnemonic(networkName, doNotDefault);
	if (!mnemonic) {
		return undefined;
	}
	return {mnemonic};
}

export function addNetworksFromEnv(networks?: Record<string, NetworkUserConfig>): Record<string, NetworkUserConfig> {
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

const listOfNetworkNamesWithTestAccountAllowed = ['hardhat', 'localhost', 'memory', 'test'];
export function addNetworksFromKnownList(
	networks?: Record<string, NetworkUserConfig>
): Record<string, NetworkUserConfig> {
	const newNetworks: Record<string, NetworkUserConfig> = networks ? {...networks} : {};
	const canonicalNames = Object.keys(chainByCanonicalName);

	for (const canonicalName of canonicalNames) {
		const chain = chainByCanonicalName[canonicalName];
		const url = getRPC(canonicalName) || chain.rpcUrls.default.http[0];
		if (!newNetworks[canonicalName]) {
			if (url) {
				newNetworks[canonicalName] = {
					type: 'http',
					url,
					accounts: getAccounts(canonicalName, !listOfNetworkNamesWithTestAccountAllowed.includes(canonicalName)),
					chainType: chain.chainType === 'op-stack' ? 'op' : undefined,
					chainId: chain.id,
				};
			} else {
				console.error(`no url for chain ${canonicalName}`);
			}
		} else {
			// console.error(`duplicated chain ${canonicalName}`);
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
		currentNetworkName !== 'edr-simulated' &&
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

	const existingForkConfiguration: EdrNetworkUserConfig =
		networks.fork && networks.fork.type === 'edr-simulated' ? networks.fork : {type: 'edr-simulated', chainType: 'l1'};

	const newNetworks: Record<string, NetworkUserConfig> = {
		...networks,
		fork: {
			...existingForkConfiguration,
			...{
				accounts: hardhatAccounts || existingForkConfiguration?.accounts,
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
