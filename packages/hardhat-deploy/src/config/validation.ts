import type {HardhatUserConfigValidationError} from '@nomicfoundation/hardhat-zod-utils';
import type {HardhatUserConfig} from 'hardhat/config';

import {validateUserConfigZodType} from '@nomicfoundation/hardhat-zod-utils';
import {z} from 'zod';

const artifactGenerationUserConfigSchema = z
	.object({
		// externalArtifacts: z.array(z.string()).optional(),
		destinations: z
			.object({
				js: z.array(z.string()).optional(),
				ts: z.array(z.string()).optional(),
				json: z.array(z.string()).optional(),
				jsm: z.array(z.string()).optional(),
				tsm: z.array(z.string()).optional(),
				directories: z.array(z.string()).optional(),
			})
			.optional(),
	})
	.optional();

export async function validateTypechainUserConfig(
	userConfig: HardhatUserConfig
): Promise<HardhatUserConfigValidationError[]> {
	return validateUserConfigZodType(userConfig.generateTypedArtifacts, artifactGenerationUserConfigSchema);
}
