import fs from 'node:fs';
import path from 'node:path';

export type FileTraversed = {
	name: string;
	path: string;
	relativePath: string;
	mtimeMs: number;
	directory: boolean;
};

export function traverse(
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
