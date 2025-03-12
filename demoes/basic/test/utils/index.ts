import {EIP1193GenericRequestProvider} from 'eip-1193';
import {loadAndExecuteDeployments} from 'rocketh';
import {context} from '../../deploy/_context.js';
import {EthereumProvider} from 'hardhat/types/providers';

export function setupFixtures(provider: EthereumProvider) {
	return {
		async deployAll() {
			const env = await loadAndExecuteDeployments(
				{
					provider: provider as EIP1193GenericRequestProvider,
				},
				context,
			);

			// Deployment are inherently untyped since they can vary from network or even before different from current artifacts
			// so here we type them manually assuming the artifact is still matching
			const GreetingsRegistry = env.get<typeof env.artifacts.GreetingsRegistry.abi>('GreetingsRegistry');

			return {env, GreetingsRegistry, namedAccounts: env.namedAccounts, unnamedAccounts: env.unnamedAccounts};
		},
	};
}
