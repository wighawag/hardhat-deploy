#!/usr/bin/env node

import { Command } from 'commander';
import { readFileSync, readdirSync, mkdirSync, copyFileSync, existsSync, writeFileSync, statSync } from 'fs';
import { join, dirname, basename } from 'path';
import { fileURLToPath } from 'url';
import * as readline from 'readline';
import pkg from '../package.json' with { type: 'json' };

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const program = new Command();

// Get the current version of hardhat-deploy
const getHardhatDeployVersion = (): string => {
  return pkg.version;
};

const askFolder = async (): Promise<string> => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question('Enter folder path (default: ./): ', (answer) => {
      rl.close();
      resolve(answer.trim() || './');
    });
  });
};

const askAutoInstall = async (): Promise<boolean> => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question('Auto-install dependencies with pnpm? (Y/n): ', (answer) => {
      rl.close();
      const trimmed = answer.trim().toLowerCase();
      resolve(trimmed === '' || trimmed === 'y' || trimmed === 'yes');
    });
  });
};

const isFolderEmpty = (folderPath: string): boolean => {
  if (!existsSync(folderPath)) {
    return true;
  }
  
  try {
    const files = readdirSync(folderPath);
    return files.length === 0;
  } catch (error) {
    // If we can't read the directory, treat it as not empty
    return false;
  }
};

const copyFile = (
  source: string,
  target: string,
  replacements: Record<string, string> = {},
  gitignorePatterns: string[] = []
): void => {
  const fileName = basename(source);
  
  // Check if file should be skipped based on gitignore patterns
  for (const pattern of gitignorePatterns) {
    if (fileName === pattern || fileName.endsWith(pattern.replace('*', ''))) {
      return; // Skip this file
    }
  }
  
  let content = readFileSync(source, 'utf-8');
  
  // Apply replacements
  for (const [search, replace] of Object.entries(replacements)) {
    content = content.replaceAll(search, replace);
  }
  
  mkdirSync(dirname(target), { recursive: true });
  
  // For binary files, just copy as-is
  if (source.endsWith('.lock') || source.endsWith('.so') || source.endsWith('.wasm')) {
    copyFileSync(source, target);
  } else {
    writeFileSync(target, content, 'utf-8');
  }
};

const parseGitignore = (gitignorePath: string): string[] => {
  if (!existsSync(gitignorePath)) {
    return [];
  }
  
  const content = readFileSync(gitignorePath, 'utf-8');
  return content
    .split('\n')
    .map((line: string) => line.trim())
    .filter((line: string) => line && !line.startsWith('#'));
};

const copyFolder = (
  source: string,
  target: string,
  replacements: Record<string, string> = {},
  gitignorePatterns: string[] = []
): void => {
  if (!existsSync(target)) {
    mkdirSync(target, { recursive: true });
  }

  const files = readdirSync(source);

  files.forEach((file) => {
    const sourcePath = join(source, file);
    const targetPath = join(target, file);

    const stat = statSync(sourcePath);

    if (stat.isDirectory()) {
      // Check if directory should be skipped based on gitignore patterns
      const shouldSkip = gitignorePatterns.some(pattern =>
        file === pattern.replace('/', '') || pattern.startsWith('/') && file === pattern.slice(1)
      );
      
      if (!shouldSkip) {
        copyFolder(sourcePath, targetPath, replacements, gitignorePatterns);
      }
    } else {
      copyFile(sourcePath, targetPath, replacements, gitignorePatterns);
    }
  });
};

const generateProject = (targetFolder: string, projectName?: string): void => {
  // find template in published package
  const templatePath = join(__dirname, '../templates/basic');
  const gitignorePath = join(templatePath, '.gitignore');
  
  // Parse gitignore patterns
  const gitignorePatterns = parseGitignore(gitignorePath);
  
  // Determine project name from folder or use placeholder
  const folderName = projectName || basename(targetFolder === './' ? process.cwd() : targetFolder);
  
  // Get the current version of hardhat-deploy
  const hardhatDeployVersion = getHardhatDeployVersion();
  
  const replacements: Record<string, string> = {
    'template-hardhat-node-test-runner': `${folderName}`,
    'workspace:*': hardhatDeployVersion,
  };
  
  console.log(`Generating project in: ${targetFolder}`);
  copyFolder(templatePath, targetFolder, replacements, gitignorePatterns);
  console.log('✓ Project initialized successfully!');
};

const runPnpmInstall = async (folderPath: string): Promise<void> => {
  console.log(`Installing dependencies...`);
  const { spawn } = await import('child_process');
  
  return new Promise((resolve, reject) => {
    const pnpm = spawn('pnpm', ['install'], {
      cwd: folderPath,
      stdio: 'inherit',
    });

    pnpm.on('close', (code) => {
      if (code === 0) {
        console.log('✓ Dependencies installed successfully!');
        resolve();
      } else {
        reject(new Error(`pnpm install failed with exit code ${code}`));
      }
    });

    pnpm.on('error', (error) => {
      reject(error);
    });
  });
};

program
  .name('hardhat-deploy')
  .description('CLI for hardhat-deploy')
  .version(pkg.version);

program
  .command('init')
  .argument('[folder]', 'folder to initialize the project in')
  .option('--install', 'auto-install dependencies with pnpm')
  .description('Initialize a new hardhat-deploy project')
  .action(async (folder?: string, options?: { install?: boolean }) => {
    let targetFolder = folder;
    let autoInstall = options?.install ?? false;
    
    // If no folder specified, ask user
    if (!targetFolder) {
      targetFolder = await askFolder();
      // If we prompted for folder, also prompt for auto-install
      autoInstall = await askAutoInstall();
    }
    
    // Normalize path
    targetFolder = targetFolder.trim();
    
    // Check if folder is empty
    if (!isFolderEmpty(targetFolder)) {
      console.error(`Error: Folder "${targetFolder}" is not empty. Please specify an empty folder or a new folder path.`);
      process.exit(1);
    }
    
    // Generate project
    generateProject(targetFolder);
    
    // Auto-install if requested
    if (autoInstall) {
      try {
        await runPnpmInstall(targetFolder);
      } catch (error) {
        console.error('Failed to install dependencies:', error);
        console.log('\nYou can install dependencies manually:');
        console.log(`  cd ${targetFolder === './' ? '.' : targetFolder}`);
        console.log('  pnpm install');
        process.exit(1);
      }
    }
    
    // Show next steps
    console.log(`\nNext steps:`);
    console.log(`  cd ${targetFolder === './' ? '.' : targetFolder}`);
    if (!autoInstall) {
      console.log(`  pnpm install`);
    }
    console.log(`  pnpm hardhat test`);
  });

program.parse();