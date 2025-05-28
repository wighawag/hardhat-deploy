import type {ArtifactGenerationConfig, ArtifactGenerationUserConfig} from '../types.js';

import {DEFAULT_CONFIG} from './default.js';

export function getConfig(userConfig: ArtifactGenerationUserConfig | undefined): ArtifactGenerationConfig {
	return {
		destinations: {
			...DEFAULT_CONFIG.destinations,
			...(userConfig?.destinations || {}),
		},
		// externalArtifacts: userConfig?.externalArtifacts || DEFAULT_CONFIG.externalArtifacts,
	};
}
