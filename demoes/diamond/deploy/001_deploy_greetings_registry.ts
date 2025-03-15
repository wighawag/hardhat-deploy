// execute is needed to register your script
import {execute} from 'rocketh';
// here we import the context, the convention is to import it from a file named `_context.ts`
import {context} from './_context.js';

export default execute(
	// we pass the context to the "execute" function
	// it will transform it while keeping type safety (in particular namedAccounts)
	context,
	// then you pass in your function that can do whatever it wants
	async ({diamond, namedAccounts, artifacts}) => {
		const {deployer} = namedAccounts;

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
			},
			// execute: {
			// 	methodName: 'init',
			// 	args: [],
			//  },
		);
	},
	// finally you can pass tags and dependencies
	{tags: ['GreetingsRegistry', 'GreetingsRegistry_deploy']},
);
