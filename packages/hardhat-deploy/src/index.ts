import type {HardhatPlugin} from 'hardhat/types/plugins';
import {task} from 'hardhat/config';

import './type-extensions.js';
import {ArgumentType} from 'hardhat/types/arguments';
import {Environment} from 'rocketh';
import type {NetworkConnection} from 'hardhat/types/network';

// const deployTask = import.meta.resolve('./tasks/deploy.js').replace('.ts', '.js');
// console.log({deployTask});

const hardhatPlugin: HardhatPlugin = {
	id: 'hardhat-deploy',
	hookHandlers: {
		config: () => import('./hook-handlers/config.js'),
		solidity: () => import('./hook-handlers/solidity.js'),
	},
	tasks: [
		task('deploy', 'Deploy contracts')
			// .addFlag('skipGasReport', 'if set, skip gas report')
			.addFlag({name: 'skipPrompts', description: 'if set, skip any prompts'})
			.addOption({
				name: 'saveDeployments',
				description: 'if set, save deployments',
				defaultValue: '',
				type: ArgumentType.STRING,
			})
			.addOption({
				name: 'tags',
				description: 'specify which tags to deploy',
				defaultValue: '',
				type: ArgumentType.STRING,
			})
			.setAction(() => import('./tasks/deploy.js'))
			.build(),
	],
	npmPackage: 'hardhat-deploy',
};

export default hardhatPlugin;

export function getHardhatConnection(env: Environment): NetworkConnection<'generic'> {
	if (!env.extra?.connection) {
		throw new Error('Hardhat deploy connection not found in the environment');
	}
	return env.extra.connection as NetworkConnection<'generic'>;
}
