import type {ArtifactGenerationConfig} from './types.js';
import debug from 'debug';
import fs from 'node:fs';
import path, {basename, dirname} from 'node:path';
import slash from 'slash';
import {FileTraversed, traverse} from './utils/files.js';

const log = debug('hardhat-deploy:generate-types');

function writeIfDifferent(filePath: string, newTextContent: string) {
	// Ensure we're working with a string
	const contentToWrite = String(newTextContent);

	try {
		let existingContent;

		try {
			existingContent = fs.readFileSync(filePath, 'utf8');
		} catch (error) {
			// console.log(`do not exist? => writing ${filePath}`);
			// File doesn't exist, write and return
			fs.writeFileSync(filePath, contentToWrite);
			return {written: true, reason: 'File did not exist'};
		}

		// Simple string comparison
		if (contentToWrite !== existingContent) {
			// console.log(`content different => writing ${filePath}`);
			fs.writeFileSync(filePath, contentToWrite);
			return {written: true, reason: 'Content was different'};
		}

		return {written: false, reason: 'Content was identical'};
	} catch (error) {
		console.error('Error in writeIfDifferent:', error);
		throw error;
	}
}

function ensureDirExistsSync(folderPath: string) {
	// Check if directory already exists
	if (fs.existsSync(folderPath)) {
		return {created: false, reason: 'Directory already exists'};
	}

	// console.log(`do not exist? => mkdir ${folderPath}`);
	// Directory doesn't exist, create it
	fs.mkdirSync(folderPath, {recursive: true});
	return {created: true, reason: 'Directory was created'};
}

type Artifact = {
	contractName: string;
	abi: any[];
	// ...
};

type Artifacts = {[key: string]: Artifact};

function writeArtifactToFile(folder: string, canonicalName: string, data: Artifact, mode: 'typescript' | 'javascript') {
	const name = canonicalName.split('/').pop();
	const artifactName = `Artifact_${name}`;
	const tsFilepath = path.join(folder, 'artifacts', canonicalName) + '.ts';
	const folderPath = path.dirname(tsFilepath);
	ensureDirExistsSync(folderPath);
	if (mode === 'typescript') {
		const newContent = `export const ${artifactName} = ${JSON.stringify(data, null, 2)} as const;`;
		writeIfDifferent(tsFilepath, newContent);
	} else if (mode === 'javascript') {
		const newContent = `export const ${artifactName} = /** @type {const} **/ (${JSON.stringify(data, null, 2)});`;
		const dtsContent = `export declare const ${artifactName}: ${JSON.stringify(data, null, 2)};`;
		const jsFilepath = path.join(folder, 'artifacts', canonicalName) + '.js';
		writeIfDifferent(jsFilepath, newContent);
		writeIfDifferent(jsFilepath.replace(/\.js$/, '.d.ts'), dtsContent);
	}
}

function writeArtifactIndexToFile(folder: string, data: Artifacts, mode: 'typescript' | 'javascript') {
	const tsFilepath = path.join(folder, 'artifacts', 'index') + '.ts';
	const folderPath = path.dirname(tsFilepath);
	ensureDirExistsSync(folderPath);
	if (mode === 'typescript') {
		let newContent = '';
		for (const canonicalName of Object.keys(data)) {
			const transformedName = canonicalName.replaceAll('/', '_').replaceAll('.', '_');
			const name = canonicalName.split('/').pop();
			const artifactName = `Artifact_${name}`;
			const importNaming =
				canonicalName != name ? `${artifactName} as ${transformedName}` : `${artifactName} as ${name}`;
			newContent += `export {${importNaming}} from './${canonicalName}.js';\n`;
		}

		writeIfDifferent(tsFilepath, newContent);
	} else if (mode === 'javascript') {
		let newContent = '';
		for (const canonicalName of Object.keys(data)) {
			const transformedName = canonicalName.replaceAll('/', '_').replaceAll('.', '_');
			const name = canonicalName.split('/').pop();
			const artifactName = `Artifact_${name}`;
			const importNaming =
				canonicalName != name ? `${artifactName} as ${transformedName}` : `${artifactName} as ${name}`;
			newContent += `export {${importNaming}} from './${canonicalName}.js';\n`;
		}
		const jsFilepath = path.join(folder, 'artifacts', 'index') + '.js';
		writeIfDifferent(jsFilepath, newContent);
		writeIfDifferent(jsFilepath.replace(/\.js$/, '.d.ts'), newContent);
	}
}

function writeABIDefinitionToFile(
	folder: string,
	canonicalName: string,
	data: Artifact,
	mode: 'typescript' | 'javascript'
) {
	const nameAsPath = canonicalName.split('/');
	const name = nameAsPath[nameAsPath.length - 1];
	const abiName = `Abi_${name}`;
	const artifactName = `Artifact_${name}`;
	const relativePath = `../`.repeat(nameAsPath.length);
	const tsFilepath = path.join(folder, 'abis', canonicalName) + '.ts';
	const folderPath = path.dirname(tsFilepath);
	ensureDirExistsSync(folderPath);
	if (mode === 'typescript') {
		const newContent = `import {${artifactName}} from '${relativePath}artifacts/${canonicalName}.js';
export type ${abiName} = (typeof ${artifactName})['abi'];\n`;
		writeIfDifferent(tsFilepath, newContent);
	} else if (mode === 'javascript') {
		const jsFilepath = path.join(folder, 'abis', canonicalName) + '.js';
		const newContent = `export {};\n`;
		const dtsContent = `import {${artifactName}} from '${relativePath}artifacts/${canonicalName}.js';
export type ${abiName} = (typeof ${artifactName})['abi'];\n`;
		writeIfDifferent(jsFilepath, newContent);
		writeIfDifferent(jsFilepath.replace(/\.js$/, '.d.ts'), dtsContent);
	}
}
function writeABIDefinitionIndexToFile(folder: string, data: Artifacts, mode: 'typescript' | 'javascript') {
	const tsFilepath = path.join(folder, 'abis', 'index') + '.ts';
	const folderPath = path.dirname(tsFilepath);
	ensureDirExistsSync(folderPath);
	if (mode === 'typescript') {
		let newContent = '';
		for (const canonicalName of Object.keys(data)) {
			const transformedName = canonicalName.replaceAll('/', '_').replaceAll('.', '_');
			const name = canonicalName.split('/').pop();
			const abiName = `Abi_${name}`;
			const importNaming = canonicalName != name ? `${abiName} as ${transformedName}` : `${abiName} as ${name}`;
			newContent += `export {${importNaming}} from "./${canonicalName}.js"\n`;
		}
		writeIfDifferent(tsFilepath, newContent);
	} else if (mode === 'javascript') {
		const jsFilepath = path.join(folder, 'abis', 'index') + '.js';
		let newContent = '';
		for (const canonicalName of Object.keys(data)) {
			const transformedName = canonicalName.replaceAll('/', '_').replaceAll('.', '_');
			const name = canonicalName.split('/').pop();
			const abiName = `Abi_${name}`;
			const importNaming = canonicalName != name ? `${abiName} as ${transformedName}` : `${abiName} as ${name}`;
			newContent += `export {${importNaming}} from "./${canonicalName}.js"\n`;
		}
		writeIfDifferent(jsFilepath, newContent);
		writeIfDifferent(jsFilepath.replace(/\.js$/, '.d.ts'), newContent);
	}
}

export async function generateTypes(paths: {artifacts: string[]}, config: ArtifactGenerationConfig): Promise<void> {
	const buildInfoCache = new Map<string, any>();
	const allArtifacts: {[name: string]: any} = {};
	const shortNameDict: {[shortName: string]: boolean} = {};

	for (const artifactsPath of paths.artifacts) {
		const files: FileTraversed[] = traverse(
			artifactsPath,
			[],
			artifactsPath,
			(name) => name != 'build-info' && !name.endsWith('.t.sol') && !name.endsWith('.dbg.json')
		);

		// console.log('--------------------------');
		// console.log(files);
		// console.log('--------------------------');

		for (const file of files) {
			const filepath = file.path;
			if (file.directory || !filepath.endsWith('.json')) {
				continue;
			}
			const filename = slash(path.basename(filepath));
			const dirname = slash(path.dirname(file.relativePath));

			// const namePath = dirname.replace('.sol', '');
			const contractName = filename.replace('.json', '');
			// const shortName = artifact.artifactsEmitted[i];
			// console.log({path: filepath});
			const content = fs.readFileSync(filepath, 'utf-8');
			const parsed = JSON.parse(content);

			if (!parsed.buildInfoId) continue;

			// TODO read config for artifacts folder
			let buildInfoFilepath = path.join(artifactsPath, 'build-info', `${parsed.buildInfoId}.output.json`);

			if (!parsed.buildInfoId) {
				// support hardhat v2 artifacts files
				if (fs.existsSync(filepath.replace('.json', '.dbg.json'))) {
					// console.warn(`Artifact ${filepath} does not have a buildInfoId, but found a .dbg.json file. Using that instead.`);
					const dbgContent = fs.readFileSync(filepath.replace('.json', '.dbg.json'), 'utf-8');
					const dbgParsed = JSON.parse(dbgContent);
					const buildInfoRelativePath = dbgParsed.buildInfo;
					parsed.buildInfoId = path.basename(buildInfoRelativePath, '.json');
					// console.log({buildInfoRelativePath, buildInfoId: parsed.buildInfoId});
					buildInfoFilepath = path.join(artifactsPath, 'build-info', `${parsed.buildInfoId}.json`);
				}
			}

			// const backupBuildInfoFilepath = path.join(
			// 	'./generated',
			// 	buildInfoFilepath.slice(buildInfoFilepath.indexOf('/', 1))
			// );
			let buildInfoFilepathToUse = buildInfoFilepath;
			// if (!fs.existsSync(buildInfoFilepathToUse)) {
			// 	buildInfoFilepathToUse = backupBuildInfoFilepath;
			// }
			let parsedBuildInfo;
			if (!buildInfoCache.has(buildInfoFilepathToUse)) {
				if (!fs.existsSync(buildInfoFilepathToUse)) continue;
				const buildInfoContent = fs.readFileSync(buildInfoFilepathToUse, 'utf-8');
				parsedBuildInfo = JSON.parse(buildInfoContent);
				buildInfoCache.set(buildInfoFilepathToUse, parsedBuildInfo);
			} else {
				parsedBuildInfo = buildInfoCache.get(buildInfoFilepathToUse);
			}

			const solidityOutput = parsedBuildInfo.output.contracts[parsed.inputSourceName][contractName];
			const hardhatArtifactObject = {...parsed, ...solidityOutput};
			const {buildInfoId, _format, ...artifactObject} = hardhatArtifactObject;
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

	// for (const key of Object.keys(allArtifacts)) {
	// 	const artifact = allArtifacts[key];
	// 	writeFiles(key, artifact, config);
	// }
	// // const json = hre.config.generateTypedArtifacts.json || [];
	// // json.push('./generated/_artifacts.json');
	// // writeFiles(undefined, allArtifacts, {...hre.config.generateTypedArtifacts, json: json});

	// writeFiles(undefined, allArtifacts, config);

	const generatedFolder = 'generated';
	const mode = 'javascript';
	for (const key of Object.keys(allArtifacts)) {
		writeABIDefinitionToFile(generatedFolder, key, allArtifacts[key], mode);
		writeArtifactToFile(generatedFolder, key, allArtifacts[key], mode);
	}

	writeArtifactIndexToFile(generatedFolder, allArtifacts, mode);
	writeABIDefinitionIndexToFile(generatedFolder, allArtifacts, mode);
}
