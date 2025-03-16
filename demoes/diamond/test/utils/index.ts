import {loadAndExecuteDeployments} from 'rocketh';
import {context} from '../../deploy/_context.js';
import {EthereumProvider} from 'hardhat/types/providers';
import {Abi_GetMessageFacet} from '../../generated/types/GetMessageFacet.js';
import {Abi_SetMessageFacet} from '../../generated/types/SetMessageFacet.js';

export function setupFixtures(provider: EthereumProvider) {
	return {
		async deployAll() {
			const env = await loadAndExecuteDeployments(
				{
					provider: provider,
				},
				context,
			);

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
