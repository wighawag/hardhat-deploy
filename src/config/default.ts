import type {ArtifactGenerationConfig} from '../types.js';

export const DEFAULT_CONFIG: ArtifactGenerationConfig = {
	js: [],
	ts: ['./generated/artifacts.ts'],
	json: [],
	jsm: [],
	tsm: [],
};
