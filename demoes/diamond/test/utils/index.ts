import {loadAndExecuteDeployments} from 'rocketh';
import {context} from '../../deploy/_context.js';
import {EthereumProvider} from 'hardhat/types/providers';

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
			const GreetingsRegistryRead = env.get<typeof env.artifacts.GetMessageFacet.abi>('GreetingsRegistry');
			const GreetingsRegistryWrite = env.get<typeof env.artifacts.SetMessageFacet.abi>('GreetingsRegistry');

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
