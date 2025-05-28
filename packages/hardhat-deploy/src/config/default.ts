import type {ArtifactGenerationConfig} from '../types.js';

export const DEFAULT_CONFIG: ArtifactGenerationConfig = {
	// externalArtifacts: [],
	destinations: {
		js: [],
		ts: ['./generated/artifacts.ts'],
		json: [],
		jsm: [],
		tsm: [],
	},
};
