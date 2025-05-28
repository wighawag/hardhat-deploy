import type {HookContext, SolidityHooks} from 'hardhat/types/hooks';

import {generateTypes} from '../generate-types.js';

export default async (): Promise<Partial<SolidityHooks>> => {
	const handlers: Partial<SolidityHooks> = {
		async onCleanUpArtifacts(
			context: HookContext,
			artifactPaths: string[],
			next: (nextContext: HookContext, artifactPaths: string[]) => Promise<void>
		) {
			let artifactPathsToProcess = [context.config.paths.artifacts];
			// if (context.config.generateTypedArtifacts.externalArtifacts) {
			// 	artifactPathsToProcess = artifactPathsToProcess.concat(
			// 		context.config.generateTypedArtifacts.externalArtifacts
			// 	);
			// }

			if (artifactPaths.length > 0) {
				await generateTypes(
					{
						artifacts: artifactPathsToProcess,
					},
					context.config.generateTypedArtifacts
				);
			}

			return next(context, artifactPaths);
		},
	};

	return handlers;
};
