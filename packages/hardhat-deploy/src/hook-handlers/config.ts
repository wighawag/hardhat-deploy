import type {ConfigHooks} from 'hardhat/types/hooks';

import {getConfig} from '../config/get-config.js';
import {validateTypechainUserConfig} from '../config/validation.js';
import {SolidityBuildProfileConfig, SolidityConfig} from 'hardhat/types/config';

function addIfNotPresent(array: string[], value: string) {
	if (array.indexOf(value) === -1) {
		array.push(value);
	}
}
function setupExtraSolcSettings(settings: {
	metadata: {useLiteralContent: boolean};
	outputSelection: {'*': {'': string[]; '*': string[]}};
}): void {
	settings.metadata = settings.metadata || {};
	settings.metadata.useLiteralContent = true;

	if (settings.outputSelection === undefined) {
		settings.outputSelection = {
			'*': {
				'*': [],
				'': [],
			},
		};
	}
	if (settings.outputSelection['*'] === undefined) {
		settings.outputSelection['*'] = {
			'*': [],
			'': [],
		};
	}
	if (settings.outputSelection['*']['*'] === undefined) {
		settings.outputSelection['*']['*'] = [];
	}
	if (settings.outputSelection['*'][''] === undefined) {
		settings.outputSelection['*'][''] = [];
	}

	addIfNotPresent(settings.outputSelection['*']['*'], 'abi');
	// addIfNotPresent(settings.outputSelection['*']['*'], 'evm.bytecode');
	// addIfNotPresent(settings.outputSelection['*']['*'], 'evm.deployedBytecode');
	addIfNotPresent(settings.outputSelection['*']['*'], 'metadata');
	addIfNotPresent(settings.outputSelection['*']['*'], 'devdoc');
	addIfNotPresent(settings.outputSelection['*']['*'], 'userdoc');
	addIfNotPresent(settings.outputSelection['*']['*'], 'storageLayout');
	// addIfNotPresent(settings.outputSelection['*']['*'], 'evm.methodIdentifiers');
	addIfNotPresent(settings.outputSelection['*']['*'], 'evm.gasEstimates');
	// addIfNotPresent(settings.outputSelection["*"][""], "ir");
	// addIfNotPresent(settings.outputSelection["*"][""], "irOptimized");
	// addIfNotPresent(settings.outputSelection["*"][""], "ast");
}

export default async (): Promise<Partial<ConfigHooks>> => {
	const handlers: Partial<ConfigHooks> = {
		validateUserConfig: validateTypechainUserConfig,
		resolveUserConfig: async (userConfig, resolveConfigurationVariable, next) => {
			const resolvedConfig = await next(userConfig, resolveConfigurationVariable);

			const solidity: SolidityConfig = structuredClone(resolvedConfig.solidity);
			const profiles: Record<string, SolidityBuildProfileConfig> = solidity.profiles;
			for (const profileName of Object.keys(profiles)) {
				const profile: SolidityBuildProfileConfig = profiles[profileName];
				const compilers = profile.compilers;
				for (const compiler of compilers) {
					const settings = compiler.settings;
					setupExtraSolcSettings(settings);
				}
			}

			return {
				...resolvedConfig,
				solidity,
				generateTypedArtifacts: getConfig(userConfig.generateTypedArtifacts),
			};
		},
	};

	return handlers;
};
