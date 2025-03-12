import type {ArtifactGenerationConfig, ArtifactGenerationUserConfig} from '../types.js';

import {DEFAULT_CONFIG} from './default.js';

export function getConfig(userConfig: ArtifactGenerationUserConfig | undefined): ArtifactGenerationConfig {
	return {
		...DEFAULT_CONFIG,
		...userConfig,
	};
}
