// we import what we need from the #rocketh alias, see ../rocketh.ts
import {Artifact_GreetingsRegistry} from '#generated/values/src/GreetingsRegistry/GreetingsRegistry.sol/GreetingsRegistry.js';
import {deployScript, artifacts} from '#rocketh';

export default deployScript(
	async ({deploy, namedAccounts}) => {
		const {deployer} = namedAccounts;

		await deploy('GreetingsRegistry', {
			account: deployer,
			artifact: Artifact_GreetingsRegistry,
			args: [''],
		});
	},
	// finally you can pass tags and dependencies
	{tags: ['GreetingsRegistry', 'GreetingsRegistry_deploy']},
);
