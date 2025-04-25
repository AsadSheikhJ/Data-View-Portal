/**
 * Combined Start Script for Data View Portal
 * 
 * This script:
 * 1. Builds the React frontend
 * 2. Starts the Express backend that also serves the frontend
 * 
 * Result: A single server running on one port that serves both frontend and API
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const sharedConfig = require('./shared-config');

console.log('📦 Data View Portal - Combined Server (Same Port)');
console.log('================================================');
console.log(`Using shared port configuration: ${sharedConfig.PORT}`);

// Set working directory
const rootDir = __dirname;
const frontendDir = path.join(rootDir, 'frontend');
const backendDir = path.join(rootDir, 'backend');

// Ensure directories exist
if (!fs.existsSync(frontendDir)) {
  console.error('❌ Frontend directory not found:', frontendDir);
  process.exit(1);
}

if (!fs.existsSync(backendDir)) {
  console.error('❌ Backend directory not found:', backendDir);
  process.exit(1);
}

// Function to execute commands
function executeCommand(command, cwd) {
  try {
    console.log(`🔄 Running: ${command}`);
    execSync(command, { 
      cwd, 
      stdio: 'inherit',
      env: { 
        ...process.env,
        PORT: sharedConfig.PORT.toString() 
      }
    });
    return true;
  } catch (error) {
    console.error(`❌ Command failed: ${command}`);
    console.error(error.message);
    return false;
  }
}

// Build frontend
console.log('\n🔨 Building React frontend...');
if (!executeCommand('npm install', frontendDir)) {
  console.error('❌ Failed to install frontend dependencies');
  process.exit(1);
}

// Pass the port through to the frontend build for any environment variables that need it
if (!executeCommand(`npm run build`, frontendDir)) {
  console.error('❌ Failed to build frontend');
  process.exit(1);
}

// Check if build folder exists
const frontendBuildDir = path.join(frontendDir, 'build');
if (!fs.existsSync(frontendBuildDir)) {
  console.error('❌ Frontend build directory not found after build:', frontendBuildDir);
  process.exit(1);
}

// Install backend dependencies
console.log('\n🔧 Installing backend dependencies...');
if (!executeCommand('npm install', backendDir)) {
  console.error('❌ Failed to install backend dependencies');
  process.exit(1);
}

// Start the combined server
console.log('\n🚀 Starting combined server (frontend + backend on same port)...');
executeCommand('node server.js', backendDir);