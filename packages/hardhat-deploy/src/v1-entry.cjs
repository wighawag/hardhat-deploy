// This file serves as a CommonJS entry point for hardhat v2
// It detects v1 users and shows them a migration message

const MIGRATION_URL = 'https://rocketh.dev/hardhat-deploy/migration-from-v1';
const V1_INSTALL_CMD = 'npm install hardhat-deploy@1';

function getHardhatVersion() {
	try {
		const {execSync} = require('child_process');
		// Run hardhat --version to get the version
		const output = execSync('hardhat --version', {encoding: 'utf-8', stdio: 'pipe'});
		return output.trim();
	} catch (e) {
		console.error(e);
		return 'unknown';
	}
}

function detectV1Patterns() {
	const fs = require('fs');
	const path = require('path');
	const reasons = [];

	// Check hardhat.config for v1 patterns
	const configFiles = ['hardhat.config.js', 'hardhat.config.cjs', 'hardhat.config.ts'];

	for (const configFile of configFiles) {
		const configPath = path.join(process.cwd(), configFile);
		if (fs.existsSync(configPath)) {
			try {
				const content = fs.readFileSync(configPath, 'utf-8');

				if (content.includes('namedAccounts')) {
					reasons.push(`Found 'namedAccounts' in ${configFile} - this is a v1 pattern`);
				}

				if (content.includes("require('hardhat-deploy')") || content.includes('require("hardhat-deploy")')) {
					reasons.push(
						`Found require('hardhat-deploy') in ${configFile} - v2 uses ESM: import HardhatDeploy from 'hardhat-deploy'`,
					);
				}

				if (content.includes('module.exports')) {
					reasons.push(`Found 'module.exports' in ${configFile} - v2 uses ESM: export default defineConfig({...})`);
				}
			} catch (e) {
				// Failed to read config - continue
			}
		}
	}

	return reasons;
}

function throwV1Error() {
	const hardhatVersion = getHardhatVersion();
	const reasons = detectV1Patterns();

	let reasonsList = '';
	if (reasons.length > 0) {
		reasonsList = '\nYour project uses hardhat-deploy v1 patterns:\n\n' + reasons.map((r) => `  • ${r}`).join('\n');
	}

	throw new Error(`
╔══════════════════════════════════════════════════════════════════════════════╗
║  HARDHAT-DEPLOY V2 - INCOMPATIBLE WITH HARDHAT V2                            ║
╚══════════════════════════════════════════════════════════════════════════════╝

hardhat-deploy v2 requires hardhat 3.x, but you are using hardhat ${hardhatVersion}.${reasonsList}

hardhat-deploy v2 has MAJOR breaking changes and uses ESM modules.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

OPTION 1: Install hardhat-deploy v1 (recommended for hardhat v2 projects)

  npm uninstall hardhat-deploy
  ${V1_INSTALL_CMD}

OPTION 2: Upgrade to hardhat 3.x and hardhat-deploy v2

  Migration guide: ${MIGRATION_URL}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`);
}

// Throw error immediately when loaded by hardhat v2
throwV1Error();

// Export a dummy function to satisfy hardhat's plugin loading
module.exports = function () {};
