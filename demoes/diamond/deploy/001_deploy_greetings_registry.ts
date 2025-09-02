// we import what we need from the @rocketh alias, see ../rocketh.ts
import {deployScript, artifacts} from '#rocketh';

export default deployScript(
	async ({diamond, namedAccounts}) => {
		const {deployer, admin} = namedAccounts;

		await diamond(
			'GreetingsRegistry',
			{
				account: deployer,
			},
			{
				facets: [{artifact: artifacts.GetMessageFacet}, {artifact: artifacts.SetMessageFacet}],
				facetsArgs: [
					{
						prefix: '',
						num: 2,
					},
				],
				owner: admin,
			},
		);
	},
	// finally you can pass tags and dependencies
	{tags: ['GreetingsRegistry', 'GreetingsRegistry_deploy']},
);
