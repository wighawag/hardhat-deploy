import type {ConfigHooks} from 'hardhat/types/hooks';

import {getConfig} from '../config/get-config.js';
import {validateTypechainUserConfig} from '../config/validation.js';

export default async (): Promise<Partial<ConfigHooks>> => {
	const handlers: Partial<ConfigHooks> = {
		validateUserConfig: validateTypechainUserConfig,
		resolveUserConfig: async (userConfig, resolveConfigurationVariable, next) => {
			const resolvedConfig = await next(userConfig, resolveConfigurationVariable);

			return {
				...resolvedConfig,
				generateArtifacts: getConfig(userConfig.generateArtifacts),
			};
		},
	};

	return handlers;
};
