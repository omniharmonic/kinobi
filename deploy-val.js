#!/usr/bin/env node
import 'dotenv/config';
import { ValTown } from '@valtown/sdk';
import { readFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, resolve } from 'path';
import { fileURLToPath } from 'url';
const __dirname = fileURLToPath(new URL('.', import.meta.url));

const VALTOWN_TOKEN = process.env.VAL_TOWN_API_KEY;

if (!VALTOWN_TOKEN) {
  console.error('❌ VAL_TOWN_API_KEY environment variable is required');
  console.log('💡 Get your token from: https://val.town/settings/tokens');
  process.exit(1);
}

const client = new ValTown({ token: VALTOWN_TOKEN });

async function deployToValTown() {
  try {
    // Always use absolute path to kinobi-deploy
    const deployDir = resolve(__dirname, 'kinobi-deploy');
    if (!existsSync(deployDir)) {
      console.error('❌ kinobi-deploy directory not found. Please run ./deploy.sh first.');
      process.exit(1);
    }
    console.log('🚀 Deploying Kinobi to Val Town from:', deployDir);
    const files = {};

    function shouldIncludeFile(relativePath) {
      // Only include:
      // - src/ (excluding test files, .DS_Store, kinobi_alpha.png)
      // - kinobi_alpha.gif
      // - package.json
      // - bun.lockb
      // - val.json
      if (relativePath.startsWith('src/')) {
        if (relativePath.endsWith('.test.ts') || relativePath.endsWith('.test.js') || relativePath.endsWith('.DS_Store') || relativePath.endsWith('kinobi_alpha.png')) {
          return false;
        }
        return true;
      }
      if ([
        'kinobi_alpha.gif',
        'package.json',
        'bun.lockb',
        'val.json'
      ].includes(relativePath)) {
        return true;
      }
      return false;
    }

    function readDirectory(dir, prefix = '') {
      const items = readdirSync(dir);
      for (const item of items) {
        const fullPath = join(dir, item);
        const relativePath = prefix ? `${prefix}/${item}` : item;
        const stats = statSync(fullPath);
        if (stats.isDirectory()) {
          readDirectory(fullPath, relativePath);
        } else {
          if (shouldIncludeFile(relativePath)) {
            const content = readFileSync(fullPath);
            files[relativePath] = content;
          }
        }
      }
    }

    readDirectory(deployDir);
    console.log('📦 Files to upload:', Object.keys(files));

    // Create or update the val
    const valName = 'kinobi';
    const description = 'Smart chore tracker with time cycles, point scoring, and leaderboards';
    
    console.log(`📦 Creating val: ${valName}`);
    
    const val = await client.vals.create({
      name: valName,
      description: description,
      files: files,
      entrypoint: 'src/server.ts',
      runtime: 'bun'
    });
    
    console.log('✅ Deployment successful!');
    console.log(`🌐 Your app is live at: https://${valName}.val.town`);
    console.log(`🔗 Val URL: https://val.town/v/${valName}`);
    
  } catch (error) {
    console.error('❌ Deployment failed:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
    process.exit(1);
  }
}

deployToValTown(); 