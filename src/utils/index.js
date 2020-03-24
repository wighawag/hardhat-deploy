const fs = require('fs');
const path = require('path');

const traverse = function(dir, result = [], topDir, filter) {
    fs.readdirSync(dir).forEach((name) => {
        const fPath = path.resolve(dir, name);
        const stats = fs.statSync(fPath);
        if(!filter || filter(name, stats)) {
            const fileStats = { name, path: fPath, relativePath: path.relative(topDir || dir, fPath), mtimeMs: stats.mtimeMs, directory: stats.isDirectory() };
            if (fileStats.directory) {
                result.push(fileStats);
                return traverse(fPath, result, topDir || dir)
            }
            result.push(fileStats);
        }
    });
    return result;
};

module.exports = {
    traverse,
}
