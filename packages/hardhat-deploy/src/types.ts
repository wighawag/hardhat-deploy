export type ArtifactGenerationUserConfig = {
	// externalArtifacts?: string[];
	destinations?: {
		js?: string[];
		ts?: string[];
		json?: string[];
		jsm?: string[];
		tsm?: string[];
	};
};

export type ArtifactGenerationConfig = {
	// externalArtifacts: string[];
	destinations: {
		js: string[];
		ts: string[];
		json: string[];
		jsm: string[];
		tsm: string[];
	};
};
