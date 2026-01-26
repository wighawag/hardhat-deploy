#!/usr/bin/env node

// Attempt to detect if user is in a v1 environment
// This script should be lightweight and fail gracefully

import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { execSync } from 'child_process';


const MIGRATION_URL = 'https://rocketh.dev/hardhat-deploy/documentation/how-to/migration-from-v1.html';
const V1_INSTALL_CMD = 'npm install hardhat-deploy@1';
const MARKER_FILE = '.hardhat-deploy-v2-notice';

// Find the project root by navigating up from node_modules
function findProjectRoot(currentPath: string): string {
	let path = currentPath;
	
	while (path !== '/' && path !== '') {
		// Check if we're inside node_modules
		if (path.includes('node_modules')) {
			path = dirname(path);
			continue;
		}
		
		// Check if this directory has a package.json (likely project root)
		if (existsSync(join(path, 'package.json'))) {
			return path;
		}
		
		path = dirname(path);
	}
	
	// Fallback to current directory
	return currentPath;
}

async function checkEnvironment() {
  // Postinstall runs in the package directory, need to find the actual project root
  const projectRoot = findProjectRoot(process.cwd());
  let v1Detected = false;
  let reasons: string[] = [];

  // Check for hardhat version via command line
  try {
    const output = execSync('hardhat --version', { encoding: 'utf-8', stdio: 'pipe', cwd: projectRoot });
    // Output format is like "hardhat, version 2.x.x" or "hardhat, version 3.x.x"
    const match = output.match(/hardhat, version (\d+\.\d+\.\d+)/);
    if (match) {
      const hardhatVersion = match[1];
      if (hardhatVersion.startsWith('2.')) {
        v1Detected = true;
        reasons.push(`hardhat ${hardhatVersion} detected (v2 requires hardhat 3.x)`);
      }
    }
  } catch (e) {
    // Hardhat not installed yet - that's fine
  }

  // Check for v1-style config patterns
  try {
    const configFiles = ['hardhat.config.js', 'hardhat.config.ts'];

    for (const configFile of configFiles) {
      const configPath = join(projectRoot, configFile);
      if (existsSync(configPath)) {
        const content = readFileSync(configPath, 'utf-8');

        if (content.includes('namedAccounts')) {
          v1Detected = true;
          reasons.push(`'namedAccounts' found in ${configFile}`);
        }

        if (content.includes("require('hardhat-deploy')") || content.includes('require("hardhat-deploy")')) {
          v1Detected = true;
          reasons.push(`require('hardhat-deploy') found in ${configFile}`);
        }

        if (content.includes('module.exports')) {
          v1Detected = true;
          reasons.push(`CommonJS 'module.exports' found in ${configFile}`);
        }
      }
    }
  } catch (e) {
    // Config check failed - continue silently
  }

  if (v1Detected) {
    printV1Warning(reasons);
    createMarkerFile(projectRoot, reasons);
  } else {
    printWelcome();
  }
}

function createMarkerFile(projectRoot: string, reasons: string[]) {
  const markerPath = join(projectRoot, MARKER_FILE);
  const content = `HARDHAT-DEPLOY V2 - V1 PATTERNS DETECTED

This file was created because hardhat-deploy v2 detected v1 patterns in your project.
You can delete this file after reading.

Detected issues:
${reasons.map((r) => `  - ${r}`).join('\n')}

To resolve this, either:

1. Install hardhat-deploy v1 instead:
   npm uninstall hardhat-deploy
   ${V1_INSTALL_CMD}

2. Migrate your project to v2:
   ${MIGRATION_URL}

For more information, see the migration guide.
`;

  try {
    writeFileSync(markerPath, content, 'utf-8');
  } catch (e) {
    // Failed to write marker file - continue anyway
  }
}

function printV1Warning(reasons: string[]) {
  const reasonsList = reasons.map((r) => `  • ${r}`).join('\n');

  console.log(`
╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║  ⚠️  HARDHAT-DEPLOY V2 - V1 PATTERNS DETECTED                                ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝

Your project appears to be using hardhat-deploy v1 patterns:

${reasonsList}

hardhat-deploy v2 has MAJOR breaking changes and requires hardhat 3.x.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

OPTION 1: Install v1 instead (recommended for existing v1 projects)

  npm uninstall hardhat-deploy
  ${V1_INSTALL_CMD}

OPTION 2: Migrate to v2

  See: ${MIGRATION_URL}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

A marker file '${MARKER_FILE}' has been created in your project root.
`);
}

function printWelcome() {
  console.log(`
✓ hardhat-deploy v2 installed successfully!
  Documentation: https://rocketh.dev/hardhat-deploy/
`);
}

checkEnvironment().catch(() => {});