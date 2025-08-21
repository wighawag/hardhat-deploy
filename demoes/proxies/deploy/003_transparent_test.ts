import {deployScript, artifacts} from '@rocketh';

export default deployScript(
	async ({deployViaProxy, namedAccounts}) => {
		const {deployer, admin} = namedAccounts;

		const prefix = 'proxy:';
		await deployViaProxy(
			'Transparent',
			{
				account: deployer,
				artifact: artifacts.GreetingsRegistry,
				args: [prefix],
			},
			{
				owner: admin,
				proxyContract: 'SharedAdminOptimizedTransparentProxy',
				linkedData: {
					prefix,
					admin,
				},
			},
		);

		await deployViaProxy(
			'Transparent',
			{
				account: deployer,
				artifact: artifacts.GreetingsRegistry2,
				args: [prefix],
			},
			{
				owner: admin,
				proxyContract: 'SharedAdminOptimizedTransparentProxy',
				linkedData: {
					prefix,
					admin,
				},
			},
		);
	},
	{tags: ['Transparent', 'Transparent_deploy']},
);
