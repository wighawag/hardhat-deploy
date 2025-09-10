import type {HardhatUserConfigValidationError} from '@nomicfoundation/hardhat-zod-utils';
import type {HardhatUserConfig} from 'hardhat/config';

import {validateUserConfigZodType} from '@nomicfoundation/hardhat-zod-utils';
import {z} from 'zod';

const artifactGenerationUserConfigSchema = z
	.object({
		// externalArtifacts: z.array(z.string()).optional(),
		destinations: z
			.array(
				z.object({
					mode: z.union([z.literal('javascript'), z.literal('typescript')]).optional(),
					folder: z.string().optional(),
				})
			)
			.optional(),
	})
	.optional();

export async function validateTypechainUserConfig(
	userConfig: HardhatUserConfig
): Promise<HardhatUserConfigValidationError[]> {
	return validateUserConfigZodType(userConfig.generateTypedArtifacts, artifactGenerationUserConfigSchema);
}
