import type {HardhatPlugin} from 'hardhat/types/plugins';
import {task} from 'hardhat/config';

import './type-extensions.js';
import {ArgumentType} from 'hardhat/types/arguments';

// const deployTask = import.meta.resolve('./tasks/deploy.js').replace('.ts', '.js');
// console.log({deployTask});

const hardhatPlugin: HardhatPlugin = {
	id: 'hardhat-deploy',
	hookHandlers: {
		config: import.meta.resolve('./hook-handlers/config.js'),
		solidity: import.meta.resolve('./hook-handlers/solidity.js'),
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
			.setAction(import.meta.resolve('./tasks/deploy.js'))
			.build(),
	],
	npmPackage: 'hardhat-deploy',
};

export default hardhatPlugin;
