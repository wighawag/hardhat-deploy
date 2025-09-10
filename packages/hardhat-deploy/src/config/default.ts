import type {ArtifactGenerationConfig} from '../types.js';

export const DEFAULT_CONFIG: ArtifactGenerationConfig = {
	// externalArtifacts: [],
	destinations: [{mode: 'javascript', folder: './generated'}],
};
