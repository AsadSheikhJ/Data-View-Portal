const fs = require('fs').promises;
const path = require('path');

const directoryConfigPath = path.join(__dirname, '..', 'config', 'directoryConfig.json');

async function readDirectoryConfigFile() {
  try {
    const data = await fs.readFile(directoryConfigPath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return []; // If file doesn't exist, return empty array
    }
    console.error('Error reading directoryConfig.json:', error);
    throw new Error('Could not read directory configuration data.');
  }
}

async function writeDirectoryConfigFile(configs) {
  try {
    await fs.writeFile(directoryConfigPath, JSON.stringify(configs, null, 2), 'utf8');
  } catch (error) {
    console.error('Error writing directoryConfig.json:', error);
    throw new Error('Could not save directory configuration data.');
  }
}

async function getAllGroupDirectoryConfigs() {
  return await readDirectoryConfigFile();
}

async function getGroupDirectoryPath(groupId) {
  const configs = await readDirectoryConfigFile();
  const config = configs.find(c => c.groupId === groupId);
  return config ? config.path : null;
}

async function setGroupDirectoryPath(groupId, directoryPath) {
  if (!groupId || !directoryPath) {
    throw new Error('Group ID and directory path are required.');
  }
  // Basic validation for the path (you might want more extensive validation)
  try {
    const stats = await fs.stat(directoryPath);
    if (!stats.isDirectory()) {
      throw new Error('Provided path is not a directory.');
    }
  } catch (error) {
    if (error.code === 'ENOENT') {
      throw new Error('Provided directory path does not exist.');
    }
    throw error; // Re-throw other fs.stat errors
  }

  const configs = await readDirectoryConfigFile();
  const existingConfigIndex = configs.findIndex(c => c.groupId === groupId);

  if (existingConfigIndex > -1) {
    configs[existingConfigIndex].path = directoryPath;
    configs[existingConfigIndex].updatedAt = new Date().toISOString();
  } else {
    configs.push({ 
      groupId, 
      path: directoryPath, 
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString() 
    });
  }
  await writeDirectoryConfigFile(configs);
  return configs.find(c => c.groupId === groupId);
}

async function deleteGroupDirectoryPath(groupId) {
  let configs = await readDirectoryConfigFile();
  const initialLength = configs.length;
  configs = configs.filter(c => c.groupId !== groupId);
  if (configs.length < initialLength) {
    await writeDirectoryConfigFile(configs);
    return true; // Deletion occurred
  }
  return false; // GroupId not found, no deletion occurred
}

module.exports = {
  getAllGroupDirectoryConfigs,
  getGroupDirectoryPath,
  setGroupDirectoryPath,
  deleteGroupDirectoryPath
}; 