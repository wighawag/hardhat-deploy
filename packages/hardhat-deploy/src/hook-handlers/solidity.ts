import type {HookContext, SolidityHooks} from 'hardhat/types/hooks';
import type {CompilationJob} from 'hardhat/types/solidity';

import {generateTypes} from '../generate-types.js';

export default async (): Promise<Partial<SolidityHooks>> => {
	const handlers: Partial<SolidityHooks> = {
		async onAllArtifactsEmitted(
			context: HookContext,
			artifacts: Map<CompilationJob, ReadonlyMap<string, string[]>>,
			next: (nextContext: HookContext, artifacts: Map<CompilationJob, ReadonlyMap<string, string[]>>) => Promise<void>
		) {
			const artifactsPaths = Array.from(artifacts.values()).flatMap((innerMap) => Array.from(innerMap.values()).flat());

			if (artifactsPaths.length > 0) {
				await generateTypes(
					{
						root: context.config.paths.root,
						artifacts: context.config.paths.artifacts,
					},
					context.config.generateArtifacts,
					artifactsPaths
				);
			}

			return next(context, artifacts);
		},
	};

	return handlers;
};
