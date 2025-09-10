export type ArtifactGenerationUserConfig = {
	// externalArtifacts?: string[];
	destinations?: {mode?: 'javascript' | 'typescript'; folder?: string}[];
};

export type ArtifactGenerationConfig = {
	// externalArtifacts: string[];
	destinations: {mode: 'javascript' | 'typescript'; folder: string}[];
};
