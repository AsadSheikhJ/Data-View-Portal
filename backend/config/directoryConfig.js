const path = require('path');
const fs = require('fs');


// Get custom directory path from JSON config if available
let customDirectoryPath = '';
try {
  // Use synchronous fs to ensure path is loaded before exporting
  const jsonConfigPath = path.join(__dirname, 'directoryConfig.json');
  if (fs.existsSync(jsonConfigPath)) {
    const jsonContent = fs.readFileSync(jsonConfigPath, 'utf8');
    const jsonConfig = JSON.parse(jsonContent);
    customDirectoryPath = jsonConfig.directoryPath || '';
  } else {
    console.log('directoryConfig.json not found, using default paths');
  }
} catch (error) {
  console.error('Error loading directory config JSON:', error.message);
}

// If we have a valid custom path, use it directly as the files directory
// Otherwise use the default path for everything
let dataDir, filesDir;

if (customDirectoryPath && fs.existsSync(customDirectoryPath)) {
  filesDir = customDirectoryPath; // Use custom path directly as files directory
  dataDir = path.dirname(customDirectoryPath); // Parent directory as data dir
} else {
  console.log('Custom path not valid or not found, using default directories');
  dataDir = path.join(__dirname, '..', 'data');
  filesDir = path.join(dataDir, 'files');
}

// These directories always use the default location
const configDir = path.join(__dirname, '..', 'data', 'config');
const tempDir = path.join(__dirname, '..', 'data', 'temp');
const logsDir = path.join(__dirname, '..', 'data', 'logs');

// Export directory paths
module.exports = {
  dataDir,
  filesDir,
  configDir,
  tempDir,
  logsDir,
  customDirectoryPath,
  isUsingCustomPath: !!customDirectoryPath && fs.existsSync(customDirectoryPath)
};
