// we import what we need from the @rocketh alias, see ../rocketh.ts
import {execute, artifacts} from '@rocketh';

export default execute(
	// this allow us to define a functiong which takes as first argument an environment object
	async ({deployViaProxy, namedAccounts}) => {
		// you can get named accounts from the environment object
		const {deployer, admin} = namedAccounts;

		const prefix = 'proxy:';
		// you can use the deployViaProxy function to deploy a contract via a proxy
		// see `import "@rocketh/proxy"` in ../rocketh.ts
		await deployViaProxy(
			'GreetingsRegistry',
			{
				account: deployer,
				artifact: artifacts.GreetingsRegistry,
				args: [prefix],
			},
			{
				owner: admin,
				linkedData: {
					prefix,
					admin,
				},
			},
		);
	},
	// finally you can pass tags and dependencies
	{tags: ['GreetingsRegistry', 'GreetingsRegistry_deploy']},
);
