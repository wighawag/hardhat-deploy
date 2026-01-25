#!/usr/bin/env node

import { readFileSync, readdirSync, existsSync, mkdirSync, copyFileSync, statSync } from 'fs';
import { join } from 'path';

const parseGitignore = (gitignorePath) => {
  if (!existsSync(gitignorePath)) {
    return [];
  }
  
  const content = readFileSync(gitignorePath, 'utf-8');
  return content
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#'));
};

const shouldSkip = (name, patterns) => {
  for (const pattern of patterns) {
    const cleanPattern = pattern.replace(/^\//, '').replace(/\/$/, '');
    if (name === cleanPattern || name.endsWith(cleanPattern)) {
      return true;
    }
  }
  return false;
};

const copyDirectory = (source, target, patterns) => {
  // Create target directory if it doesn't exist
  if (!existsSync(target)) {
    mkdirSync(target, { recursive: true });
  }

  const files = readdirSync(source);

  for (const file of files) {
    const sourcePath = join(source, file);
    const targetPath = join(target, file);

    // Skip if matches gitignore pattern
    if (shouldSkip(file, patterns)) {
      console.log(`  Skipping: ${file}`);
      continue;
    }

    const stat = statSync(sourcePath);

    if (stat.isDirectory()) {
      copyDirectory(sourcePath, targetPath, patterns);
    } else {
      copyFileSync(sourcePath, targetPath);
      console.log(`  Copied: ${file}`);
    }
  }
};

const main = () => {
  const sourceTemplatePath = join(process.cwd(), '../../templates/basic');
  const targetTemplatePath = join(process.cwd(), 'templates/basic');
  const gitignorePath = join(sourceTemplatePath, '.gitignore');
  
  console.log('Preparing template for publishing...\n');
  
  const patterns = parseGitignore(gitignorePath);
  
  // Copy template (filtering out gitignore patterns)
  copyDirectory(sourceTemplatePath, targetTemplatePath, patterns);
  
  console.log('\n✓ Template prepared successfully');
};

main();