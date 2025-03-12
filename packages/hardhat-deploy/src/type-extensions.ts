import 'hardhat/types/config';
import {ArtifactGenerationConfig, ArtifactGenerationUserConfig} from './types.js';

declare module 'hardhat/types/config' {
	export interface HardhatUserConfig {
		generateArtifacts?: ArtifactGenerationUserConfig;
	}

	export interface HardhatConfig {
		readonly generateArtifacts: ArtifactGenerationConfig;
	}
}
