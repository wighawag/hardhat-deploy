import type {ArtifactGenerationConfig, ArtifactGenerationUserConfig} from '../types.js';

import {DEFAULT_CONFIG} from './default.js';

export function getConfig(userConfig: ArtifactGenerationUserConfig | undefined): ArtifactGenerationConfig {
	return {
		destinations:
			userConfig?.destinations?.map((v) => ({mode: v.mode || 'javascript', folder: v.folder || './generated'})) ||
			DEFAULT_CONFIG.destinations,
		// externalArtifacts: userConfig?.externalArtifacts || DEFAULT_CONFIG.externalArtifacts,
	};
}
