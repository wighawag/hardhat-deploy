import {Abi_IGreetingsRegistry} from '../generated/abis/IGreetingsRegistry.js';
import {deployScript, artifacts} from '../rocketh/deploy.js';

export default deployScript(
	async ({deployViaRouter, deployViaProxy, namedAccounts}) => {
		const {deployer, admin} = namedAccounts;

		const config = {
			prefix: '',
			num: 2,
		};
		const routes = [
			{name: 'GetMessage', artifact: artifacts.GetMessage, args: [config]},
			{name: 'SetMessage', artifact: artifacts.SetMessage, args: [config]},
		];

		// await deployViaRouter(
		// 	'GreetingsRegistry',
		// 	{
		// 		account: deployer,
		// 	},
		// 	routes,
		// 	{
		// 		routerContract: {type: 'custom', artifact: artifacts.Router10X60},
		// 		linkedData: config,
		// 	},
		// );

		await deployViaProxy<Abi_IGreetingsRegistry>(
			'GreetingsRegistry',
			{
				account: deployer,
				artifact: (name, params, options) => {
					return deployViaRouter<Abi_IGreetingsRegistry>(name, params, routes, {
						...options,
						// routerContract: {type: 'custom', artifact: artifacts.Router10X60},
					});
				},
				args: [config],
			},
			{
				owner: admin,
				linkedData: config,
				// proxyContract: {
				// 	type: 'custom',
				// 	artifact: artifacts.ERC173Proxy,
				// },
			},
		);
	},
	// finally you can pass tags and dependencies
	{tags: ['GreetingsRegistry', 'GreetingsRegistry_deploy']},
);
