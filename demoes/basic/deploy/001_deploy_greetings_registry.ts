// we import what we need from the #rocketh alias, see ../rocketh.ts
import {Artifact_GreetingsRegistry} from '#generated/artifacts/src/GreetingsRegistry/GreetingsRegistry.sol/GreetingsRegistry.js';
import {deployScript, artifacts} from '#rocketh';

export default deployScript(
	async ({deploy, namedAccounts}) => {
		const {deployer} = namedAccounts;

		await deploy('GreetingsRegistry', {
			account: deployer,
			artifact: artifacts.GreetingsRegistry2,
			args: [''],
		});
	},
	// finally you can pass tags and dependencies
	{tags: ['GreetingsRegistry', 'GreetingsRegistry_deploy']},
);
