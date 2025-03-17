// we import what we need from the @rocketh alias, see ../rocketh.ts
import {execute, artifacts} from '@rocketh';

export default execute(
	async ({deploy, namedAccounts}) => {
		const {deployer} = namedAccounts;

		await deploy('GreetingsRegistry', {
			account: deployer,
			artifact: artifacts.GreetingsRegistry,
			args: [''],
		});
	},
	// finally you can pass tags and dependencies
	{tags: ['GreetingsRegistry', 'GreetingsRegistry_deploy']},
);
