import type {HookContext, SolidityHooks} from 'hardhat/types/hooks';

import {generateTypes} from '../generate-types.js';

export default async (): Promise<Partial<SolidityHooks>> => {
	const handlers: Partial<SolidityHooks> = {
		async onCleanUpArtifacts(
			context: HookContext,
			artifactPaths: string[],
			next: (nextContext: HookContext, artifactPaths: string[]) => Promise<void>,
		) {
			if (artifactPaths.length > 0) {
				await generateTypes(
					{
						root: context.config.paths.root,
						artifacts: context.config.paths.artifacts,
					},
					context.config.generateArtifacts,
					artifactPaths,
				);
			}

			return next(context, artifactPaths);
		},
	};

	return handlers;
};
