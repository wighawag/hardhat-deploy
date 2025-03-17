import {loadAndExecuteDeployments} from 'rocketh';
import {artifacts} from '@rocketh';
import {EthereumProvider} from 'hardhat/types/providers';

export function setupFixtures(provider: EthereumProvider) {
	return {
		async deployAll() {
			const env = await loadAndExecuteDeployments({
				provider: provider,
			});

			// Deployment are inherently untyped since they can vary from network or even before different from current artifacts
			// so here we type them manually assuming the artifact is still matching
			const GreetingsRegistry = env.get<typeof artifacts.GreetingsRegistry.abi>('GreetingsRegistry');

			return {env, GreetingsRegistry, namedAccounts: env.namedAccounts, unnamedAccounts: env.unnamedAccounts};
		},
	};
}
