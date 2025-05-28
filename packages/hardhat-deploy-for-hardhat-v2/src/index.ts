import './type-extensions';

import fs from 'node:fs';
import path from 'node:path';

import {task, extendConfig} from 'hardhat/config';
import {TASK_COMPILE} from 'hardhat/builtin-tasks/task-names';
import {ConfigOptions, loadAndExecuteDeployments} from 'rocketh';
import type {HardhatConfig, HardhatUserConfig} from 'hardhat/types';
import {ArtifactGenerationConfig} from './type-extensions.js';

export * from './utils.js';

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

extendConfig((config: HardhatConfig, userConfig: Readonly<HardhatUserConfig>) => {
	config.generateTypedArtifacts = {
		destinations: {
			ts: ['./generated/artifacts.ts'],
			js: [],
			json: [],
			tsm: [],
			jsm: [],
			directories: [userConfig.paths?.sources || 'contracts'],
			...(userConfig.generateTypedArtifacts?.destinations || {}),
		},
		// externalArtifacts: userConfig.generateTypedArtifacts?.externalArtifacts || [],
	};

	for (const compiler of config.solidity.compilers) {
		setupExtraSolcSettings(compiler.settings);
	}
	for (const key of Object.keys(config.solidity.overrides)) {
		const override = config.solidity.overrides[key];
		setupExtraSolcSettings(override.settings);
	}
});

task('deploy', 'Deploy contracts')
	.addFlag('skipGasReport', 'if set, skip gas report')
	.addFlag('skipPrompts', 'if set, skip any prompts')
	.addOptionalParam('saveDeployments', 'if set, save deployments')
	.setAction(async (args, hre) => {
		let saveDeployments = args.saveDeployments;
		if (process.env.HARDHAT_FORK) {
			saveDeployments = false;
		}
		await loadAndExecuteDeployments({
			...(args as ConfigOptions),
			logLevel: 1,
			provider: hre.network.provider as unknown as any,
			network: process.env.HARDHAT_FORK ? {fork: process.env.HARDHAT_FORK} : hre.network.name,
			saveDeployments,
			askBeforeProceeding: args.skipPrompts ? false : true,
			reportGasUse: args.skipGasReport ? false : true,
		});
	});

type FileTraversed = {
	name: string;
	path: string;
	relativePath: string;
	mtimeMs: number;
	directory: boolean;
};

function traverse(
	dir: string,
	result: any[] = [],
	topDir?: string,
	filter?: (name: string, stats: any) => boolean // TODO any is Stats
): Array<FileTraversed> {
	fs.readdirSync(dir).forEach((name) => {
		const fPath = path.resolve(dir, name);
		const stats = fs.statSync(fPath);
		if ((!filter && !name.startsWith('.')) || (filter && filter(name, stats))) {
			const fileStats = {
				name,
				path: fPath,
				relativePath: path.relative(topDir || dir, fPath),
				mtimeMs: stats.mtimeMs,
				directory: stats.isDirectory(),
			};
			if (fileStats.directory) {
				result.push(fileStats);
				return traverse(fPath, result, topDir || dir, filter);
			}
			result.push(fileStats);
		}
	});
	return result;
}

function writeFiles(name: string | undefined, data: any, config: ArtifactGenerationConfig) {
	const destinations = config.destinations;
	const js = typeof destinations?.js === 'string' ? [destinations?.js] : destinations?.js || [];
	const ts = typeof destinations?.ts === 'string' ? [destinations?.ts] : destinations?.ts || [];
	const json = typeof destinations?.json === 'string' ? [destinations?.json] : destinations?.json || [];
	const jsm = typeof destinations?.jsm === 'string' ? [destinations?.jsm] : destinations?.jsm || [];
	const tsm = typeof destinations?.tsm === 'string' ? [destinations?.tsm] : destinations?.tsm || [];

	if (ts.length > 0) {
		const newContent = `export default ${JSON.stringify(data, null, 2)} as const;`;
		for (const tsFile of ts) {
			if (tsFile.endsWith('.ts')) {
				if (!name) {
					const filepath = tsFile;
					const folderPath = path.dirname(filepath);
					fs.mkdirSync(folderPath, {recursive: true});
					fs.writeFileSync(filepath, newContent);
				}
			} else {
				if (name) {
					const filepath = `${tsFile}/${name}.ts`;
					const folderPath = path.dirname(filepath);
					fs.mkdirSync(folderPath, {recursive: true});
					fs.writeFileSync(filepath, newContent);
				}
			}
		}
	}

	if (js.length > 0) {
		const newContent = `export default /** @type {const} **/ (${JSON.stringify(data, null, 2)});`;
		// const dtsContent = `export = ${JSON.stringify(data, null, 2)} as const;`;
		const dtsContent = `declare const _default: ${JSON.stringify(data, null, 2)};export default _default;`;
		// const dtsContent = `declare const _default: ${JSON.stringify(data, null, 2)};export = _default;`;
		const cjsContent = `module.exports = /** @type {const} **/ (${JSON.stringify(data, null, 2)});`;
		for (const jsFile of js) {
			if (jsFile.endsWith('.js')) {
				if (!name) {
					const filepath = jsFile;
					const folderPath = path.dirname(filepath);
					fs.mkdirSync(folderPath, {recursive: true});
					fs.writeFileSync(filepath, newContent);
					fs.writeFileSync(filepath.replace(/\.js$/, '.d.ts'), dtsContent);
					fs.writeFileSync(filepath.replace(/\.js$/, '.cjs'), cjsContent);
				}
			} else {
				if (name) {
					const filepath = `${jsFile}/${name}.js`;
					const folderPath = path.dirname(filepath);
					fs.mkdirSync(folderPath, {recursive: true});
					fs.writeFileSync(filepath, newContent);
					fs.writeFileSync(filepath.replace(/\.js$/, '.d.ts'), dtsContent);
					fs.writeFileSync(filepath.replace(/\.js$/, '.cjs'), cjsContent);
				}
			}
		}
	}

	if (json.length > 0) {
		const newContent = JSON.stringify(data, null, 2);
		for (const jsonFile of json) {
			if (jsonFile.endsWith('.json')) {
				if (!name) {
					const filepath = jsonFile;
					const folderPath = path.dirname(filepath);
					fs.mkdirSync(folderPath, {recursive: true});
					fs.writeFileSync(filepath, newContent);
				}
			} else {
				if (name) {
					const filepath = `${jsonFile}/${name}.json`;
					const folderPath = path.dirname(filepath);
					fs.mkdirSync(folderPath, {recursive: true});
					fs.writeFileSync(filepath, newContent);
				}
			}
		}
	}

	if (!name) {
		if (tsm.length > 0) {
			let newContent = '';
			for (const key of Object.keys(data)) {
				newContent += `export const ${key} = ${JSON.stringify(data[key], null, 2)} as const;`;
			}
			for (const tsFile of tsm) {
				const filepath = tsFile;
				const folderPath = path.dirname(filepath);
				fs.mkdirSync(folderPath, {recursive: true});
				fs.writeFileSync(filepath, newContent);
			}
		}

		if (jsm.length > 0) {
			let newContent = '';
			for (const key of Object.keys(data)) {
				newContent += `export const ${key} = /** @type {const} **/ (${JSON.stringify(data[key], null, 2)});`;
			}
			for (const jsFile of jsm) {
				const filepath = jsFile;
				const folderPath = path.dirname(filepath);
				fs.mkdirSync(folderPath, {recursive: true});
				fs.writeFileSync(filepath, newContent);
			}
		}
	}
}

task(TASK_COMPILE).setAction(async (args, hre, runSuper): Promise<any> => {
	// let previousArtifacts: {[name: string]: any} = {};
	// try {
	// 	previousArtifacts = JSON.parse(fs.readFileSync('./generated/_artifacts.json', 'utf-8'));
	// } catch {}
	// const allArtifacts: {[name: string]: any} = previousArtifacts;
	const allArtifacts: {[name: string]: any} = {};
	const shortNameDict: {[shortName: string]: boolean} = {};
	// for (const key of Object.keys(allArtifacts)) {
	// 	if (!key.indexOf('/')) {
	// 		shortNameDict[key] = true;
	// 	}
	// }

	const compilationResult = await runSuper(args);

	// for (const artifact of artifactResult.artifactsEmittedPerFile) {
	// 	const filepath = `./artifacts/${artifact.file.sourceName}/${artifact.artifactsEmitted[0]}.json`;
	// 	if (fs.existsSync(filepath)) {
	// 		for (let i = 0; i < artifact.artifactsEmitted.length; i++) {
	// 			const shortName = artifact.artifactsEmitted[i];
	// 			const content = fs.readFileSync(filepath, 'utf-8');
	// 			const parsed = JSON.parse(content);

	// 			const debugFilepath = filepath.replace('.json', '.dbg.json');
	// 			const debugContent = fs.readFileSync(debugFilepath, 'utf-8');
	// 			const parsedDebug: {_format: string; buildInfo: string} = JSON.parse(debugContent);
	// 			const buildInfoFilepath = path.join(path.dirname(path.resolve(debugFilepath)), parsedDebug.buildInfo);
	// 			const buildInfoContent = fs.readFileSync(buildInfoFilepath, 'utf-8');
	// 			const parsedBuildInfo = JSON.parse(buildInfoContent);
	// 			const solidityOutput = parsedBuildInfo.output.contracts[artifact.file.sourceName][shortName];

	// 			const artifactObject = {...parsed, ...solidityOutput};
	// 			const fullName = `${artifact.file.sourceName}/${shortName}`;
	// 			allArtifacts[fullName] = artifactObject;
	// 			if (shortNameDict[shortName]) {
	// 				delete allArtifacts[shortName];
	// 			} else {
	// 				allArtifacts[shortName] = artifactObject;
	// 				shortNameDict[shortName] = true;
	// 			}
	// 		}
	// 	} else {
	// 		// this can happen for solidity file without contract exported, just error or types for example
	// 		// throw new Error(`no artifact at ${filepath}`);
	// 	}
	// }

	const files: FileTraversed[] = [];
	for (const directory of hre.config.generateTypedArtifacts.destinations.directories) {
		const filesToAdd = traverse(`./artifacts/${directory}`, [], './artifacts', (name) => name != 'build-info');
		files.push(...filesToAdd);
	}

	for (const file of files) {
		const filename = path.basename(file.path);
		const dirname = path.dirname(file.relativePath);
		// const namePath = dirname.replace('.sol', '');
		const contractName = filename.replace('.json', '');
		if (file.directory || file.path.endsWith('.dbg.json')) {
			continue;
		}
		// const shortName = artifact.artifactsEmitted[i];
		const content = fs.readFileSync(file.path, 'utf-8');
		const parsed = JSON.parse(content);

		const debugFilepath = file.path.replace('.json', '.dbg.json');
		const debugContent = fs.readFileSync(debugFilepath, 'utf-8');
		const parsedDebug: {_format: string; buildInfo: string} = JSON.parse(debugContent);
		const buildInfoFilepath = path.join(path.dirname(path.relative('.', debugFilepath)), parsedDebug.buildInfo);

		const backupBuildInfoFilepath = path.join(
			'./generated',
			buildInfoFilepath.slice(buildInfoFilepath.indexOf('/', 1))
		);
		let buildInfoFilepathToUse = buildInfoFilepath;
		if (!fs.existsSync(buildInfoFilepathToUse)) {
			buildInfoFilepathToUse = backupBuildInfoFilepath;
		}
		if (fs.existsSync(buildInfoFilepathToUse)) {
			const buildInfoContent = fs.readFileSync(buildInfoFilepathToUse, 'utf-8');

			if (buildInfoFilepathToUse !== backupBuildInfoFilepath) {
				fs.mkdirSync(path.dirname(backupBuildInfoFilepath), {recursive: true});
				fs.writeFileSync(backupBuildInfoFilepath, buildInfoContent);
			}

			const parsedBuildInfo = JSON.parse(buildInfoContent);
			const solidityOutput = parsedBuildInfo.output.contracts[dirname][contractName];

			const artifactObject = {...parsed, ...solidityOutput};
			const fullName = `${dirname}/${contractName}`;
			allArtifacts[fullName] = artifactObject;
			if (shortNameDict[contractName]) {
				delete allArtifacts[contractName];
			} else {
				allArtifacts[contractName] = artifactObject;
				shortNameDict[contractName] = true;
			}
		}
	}
	for (const key of Object.keys(allArtifacts)) {
		if (key.indexOf('/') >= 0) {
			const split = key.split('/');
			if (split.length > 1) {
				const shortName = split[split.length - 1];
				if (allArtifacts[shortName]) {
					delete allArtifacts[key];
				}
			}
		}
	}

	for (const key of Object.keys(allArtifacts)) {
		const artifact = allArtifacts[key];
		writeFiles(key, artifact, hre.config.generateTypedArtifacts);
	}
	// const json = hre.config.generateTypedArtifacts.json || [];
	// json.push('./generated/_artifacts.json');
	// writeFiles(undefined, allArtifacts, {...hre.config.generateTypedArtifacts, json: json});

	writeFiles(undefined, allArtifacts, hre.config.generateTypedArtifacts);

	return compilationResult;
});

// TODO add docgen command ?
// task("docgen").setAction(async (args, hre, runSuper): Promise<any> => {
