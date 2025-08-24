#!/usr/bin/env node

// quickStart.js - Setup script for Aptos Move integration
const fs = require('fs');
const path = require('path');

console.log('🚀 NeuroDex Aptos Integration - Quick Start\n');

// Check if we're in the right directory
const currentDir = process.cwd();
const packageJsonPath = path.join(currentDir, 'package.json');

if (!fs.existsSync(packageJsonPath)) {
  console.error('❌ Error: package.json not found. Please run this from your React project root.');
  process.exit(1);
}

// Read package.json to check if it's a React project
try {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  if (!packageJson.dependencies || !packageJson.dependencies.react) {
    console.error('❌ Error: This doesn\'t appear to be a React project.');
    process.exit(1);
  }

  console.log('✅ React project detected');
  console.log(`   Project: ${packageJson.name}`);
  console.log(`   React version: ${packageJson.dependencies.react}\n`);

} catch (error) {
  console.error('❌ Error reading package.json:', error.message);
  process.exit(1);
}

// Check for required dependencies
const requiredDeps = {
  '@aptos-labs/ts-sdk': '^1.21.0',
  'react-router-dom': '^6.23.0'
};

console.log('📋 Checking dependencies...');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const missingDeps = [];

for (const [dep, version] of Object.entries(requiredDeps)) {
  if (!packageJson.dependencies || !packageJson.dependencies[dep]) {
    missingDeps.push(`${dep}@${version}`);
  } else {
    console.log(`   ✅ ${dep}`);
  }
}

if (missingDeps.length > 0) {
  console.log('\n❌ Missing dependencies:');
  missingDeps.forEach(dep => console.log(`   - ${dep}`));
  console.log('\nPlease install them with:');
  console.log(`   npm install ${missingDeps.join(' ')}\n`);
} else {
  console.log('   ✅ All dependencies present\n');
}

// Check for environment file
const envPath = path.join(currentDir, '.env.local');
const envExamplePath = path.join(currentDir, '.env.example');

if (!fs.existsSync(envPath)) {
  console.log('⚙️  Setting up environment configuration...');
  
  if (fs.existsSync(envExamplePath)) {
    fs.copyFileSync(envExamplePath, envPath);
    console.log('   ✅ Created .env.local from .env.example');
    console.log('   ⚠️  Remember to update with your contract addresses!');
  } else {
    console.log('   ❌ .env.example not found. Please create .env.local manually.');
  }
} else {
  console.log('   ✅ .env.local already exists\n');
}

// Check for contract config
const contractConfigPath = path.join(currentDir, 'src', 'config', 'contractConfig.js');

if (fs.existsSync(contractConfigPath)) {
  console.log('   ✅ Contract configuration found');
} else {
  console.log('   ❌ Contract configuration missing at src/config/contractConfig.js');
  console.log('       This file contains your deployed contract addresses.');
}

// Final instructions
console.log('\n🎯 Next Steps:');
console.log('');
console.log('1. Update Contract Addresses:');
console.log('   Edit src/config/contractConfig.js with your deployed addresses');
console.log('');
console.log('2. Configure Environment:');
console.log('   Edit .env.local with your AI agent backend URL');
console.log('');
console.log('3. Start Development Server:');
console.log('   npm run dev');
console.log('');
console.log('4. Test Wallet Connection:');
console.log('   Install Petra or Martian wallet extension');
console.log('   Connect and test basic functionality');
console.log('');
console.log('📚 For detailed setup instructions, see:');
console.log('   INTEGRATION_GUIDE.md');
console.log('');
console.log('🎉 Happy building! Your Aptos Move contracts are ready for integration.');
