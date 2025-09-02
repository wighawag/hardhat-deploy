import {deployScript, artifacts} from '#rocketh';

export default deployScript(
	async ({deployViaProxy, namedAccounts}) => {
		const {deployer, admin} = namedAccounts;

		const prefix = 'proxy:';
		await deployViaProxy(
			'UUPS',
			{
				account: deployer,
				artifact: artifacts.UUPSImplementation1,
				args: [admin, prefix],
			},
			{
				owner: admin,
				proxyContract: 'UUPS',
				execute: 'init',
				linkedData: {
					prefix,
					admin,
				},
			},
		);

		await deployViaProxy(
			'UUPS',
			{
				account: deployer,
				artifact: artifacts.UUPSImplementation2,
				args: [prefix],
			},
			{
				owner: admin,
				proxyContract: 'UUPS',
				linkedData: {
					prefix,
					admin,
				},
			},
		);
	},
	{tags: ['UUPS', 'UUPS_deploy']},
);
