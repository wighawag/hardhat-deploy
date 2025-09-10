// we import what we need from the #rocketh alias, see ../rocketh.ts
import {src_GreetingsRegistry_GreetingsRegistry_sol_GreetingsRegistry} from '#generated/types/index.js';
import {GreetingsRegistry} from '#generated/values/src/GreetingsRegistry/GreetingsRegistry.sol/GreetingsRegistry.js';
import {deployScript, artifacts} from '#rocketh';

export default deployScript(
	async ({deploy, namedAccounts}) => {
		const {deployer} = namedAccounts;

		const t: Abi_GreetingsRegistry;
		await deploy('GreetingsRegistry', {
			account: deployer,
			artifact: GreetingsRegistry,
			args: [''],
		});
	},
	// finally you can pass tags and dependencies
	{tags: ['GreetingsRegistry', 'GreetingsRegistry_deploy']},
);
