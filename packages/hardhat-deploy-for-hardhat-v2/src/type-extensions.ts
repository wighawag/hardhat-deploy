import 'hardhat/types/runtime';
import 'hardhat/types/config';

export type ArtifactGenerationUserConfig = {
	// externalArtifacts: string[];
	destinations: {
		js?: string[];
		ts?: string[];
		json?: string[];
		jsm?: string[];
		tsm?: string[];
		directories?: string[];
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
		directories: string[];
	};
};

declare module 'hardhat/types/config' {
	interface HardhatUserConfig {
		generateTypedArtifacts?: ArtifactGenerationUserConfig;
	}

	interface HardhatConfig {
		generateTypedArtifacts: ArtifactGenerationConfig;
	}
}
