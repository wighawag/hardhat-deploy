import {EthereumProvider} from 'hardhat/types/providers';
import {loadAndExecuteDeploymentsFromFiles} from '../../rocketh/environment.js';
import {Abi_GetMessageFacet} from '../../generated/abis/GetMessageFacet.js';
import {Abi_SetMessageFacet} from '../../generated/abis/SetMessageFacet.js';

export function setupFixtures(provider: EthereumProvider) {
	return {
		async deployAll() {
			const env = await loadAndExecuteDeploymentsFromFiles({
				provider: provider,
			});

			// Deployment are inherently untyped since they can vary from network or even before different from current artifacts
			// so here we type them manually assuming the artifact is still matching
			const GreetingsRegistryRead = env.get<Abi_GetMessageFacet>('GreetingsRegistry');
			const GreetingsRegistryWrite = env.get<Abi_SetMessageFacet>('GreetingsRegistry');

			return {
				env,
				GreetingsRegistryRead,
				GreetingsRegistryWrite,
				namedAccounts: env.namedAccounts,
				unnamedAccounts: env.unnamedAccounts,
			};
		},
	};
}
