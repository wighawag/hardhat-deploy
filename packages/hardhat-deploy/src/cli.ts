#!/usr/bin/env node

import { Command } from 'commander';
import { readFileSync, readdirSync, mkdirSync, copyFileSync, existsSync, writeFileSync, statSync } from 'fs';
import { join, dirname, basename } from 'path';
import { fileURLToPath } from 'url';
import * as readline from 'readline';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const program = new Command();

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

const copyFile = (source: string, target: string, replacements: Record<string, string> = {}): void => {
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

const copyFolder = (source: string, target: string, replacements: Record<string, string> = {}): void => {
  if (!existsSync(target)) {
    mkdirSync(target, { recursive: true });
  }

  const files = readdirSync(source);

  files.forEach((file) => {
    const sourcePath = join(source, file);
    const targetPath = join(target, file);

    const stat = statSync(sourcePath);

    if (stat.isDirectory()) {
      copyFolder(sourcePath, targetPath, replacements);
    } else {
      copyFile(sourcePath, targetPath, replacements);
    }
  });
};

const generateProject = (targetFolder: string, projectName?: string): void => {
  // Template path is at repository root, not in packages/hardhat-deploy
  const templatePath = join(__dirname, '../../../../templates/basic');
  
  // Determine project name from folder or use placeholder
  const folderName = projectName || basename(targetFolder === './' ? process.cwd() : targetFolder);
  
  const replacements: Record<string, string> = {
    'template-hardhat-node-test-runner': `hardhat-${folderName}`,
  };
  
  console.log(`Generating project in: ${targetFolder}`);
  copyFolder(templatePath, targetFolder, replacements);
  console.log('✓ Project initialized successfully!');
  console.log(`\nNext steps:`);
  console.log(`  cd ${targetFolder === './' ? '.' : targetFolder}`);
  console.log(`  pnpm install`);
  console.log(`  pnpm hardhat test`);
};

program
  .name('hardhat-deploy')
  .description('CLI for hardhat-deploy')
  .version('2.0.0-next.61');

program
  .command('init')
  .argument('[folder]', 'folder to initialize the project in')
  .description('Initialize a new hardhat-deploy project')
  .action(async (folder?: string) => {
    let targetFolder = folder;
    
    // If no folder specified, ask user
    if (!targetFolder) {
      targetFolder = await askFolder();
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
  });

program.parse();