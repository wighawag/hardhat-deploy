import 'hardhat/types/config';
import {ArtifactGenerationConfig, ArtifactGenerationUserConfig} from './types.js';

declare module 'hardhat/types/config' {
	export interface HardhatUserConfig {
		generateTypedArtifacts?: ArtifactGenerationUserConfig;
	}

	export interface HardhatConfig {
		readonly generateTypedArtifacts: ArtifactGenerationConfig;
	}
}
