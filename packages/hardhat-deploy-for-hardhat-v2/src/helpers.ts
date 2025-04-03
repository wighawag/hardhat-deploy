import type {HardhatRuntimeEnvironment} from 'hardhat/types';
import {Environment, loadEnvironment} from 'rocketh';

export async function loadEnvironmentFromHardhat(
	{hre}: {hre: HardhatRuntimeEnvironment},
	options?: {
		useChainIdOfForkedNetwork?: boolean;
	},
): Promise<Environment> {
	let provider: any = hre.network.provider;
	let network: string | {fork: string} = hre.network.name;
	let forkChainId: number | undefined;
	const fork = process.env.HARDHAT_FORK as string | undefined;
	if (fork) {
		if (options?.useChainIdOfForkedNetwork) {
			const forkNetworkConfig = hre.config.networks[fork];

			if (forkNetworkConfig.chainId) {
				forkChainId = forkNetworkConfig.chainId;
			} else {
				if ('url' in forkNetworkConfig) {
					const response = await fetch(forkNetworkConfig.url, {
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

	return loadEnvironment({
		provider,
		network,
	});
}
