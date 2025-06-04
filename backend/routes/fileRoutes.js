const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
const multer = require('multer');
const archiver = require('archiver'); // Add this dependency for zip functionality
const directoryConfig = require('../config/directoryConfig');
const { handleFileUploadError } = require('../middleware/errorHandlers'); // Add this import
const authMiddleware = require('../middleware/auth');
// const { checkPermission, checkSpecificPermission } = require('../middleware/permissions'); // checkSpecificPermission might be unused now
// const Group = require('../models/Group'); // REMOVED Mongoose Model
const groupFileService = require('../services/groupFileService'); // ADDED File Service
const userFileService = require('../services/userFileService'); // For populating user details if needed
const directoryConfigService = require('../services/directoryConfigService'); // IMPORTANT: For group paths

// Apply auth middleware to ALL routes in this router
router.use(authMiddleware);

// Define role hierarchy for group permissions
const roleHierarchy = {
  viewer: 1,
  editor: 2,
  admin: 3,
};

// Helper function to check if user has sufficient role within a group
const hasGroupPermission = (userRoleInGroup, requiredRole) => {
  const userLevel = roleHierarchy[userRoleInGroup] || 0;
  const requiredLevel = roleHierarchy[requiredRole] || 0;
  return userLevel >= requiredLevel;
};

// Debug the directory configuration
console.log('Files directory path:', directoryConfig.filesDir);
// console.log('Using custom path:', directoryConfig.isUsingCustomPath ? 'Yes' : 'No');

// Centralized helper to get group, validate user, and get group's base path
async function getGroupUserAndPath(groupId, userId, requiredRole = 'viewer') {
  if (!groupId) {
    throw { status: 400, message: 'Group ID is required' };
  }
  const group = await groupFileService.getGroupById(groupId);
  if (!group) {
    throw { status: 404, message: 'Group not found' };
  }

  const groupBasePath = await directoryConfigService.getGroupDirectoryPath(groupId);
  if (!groupBasePath) {
    throw { status: 400, message: `Directory path for group '${group.name}' is not configured. Please set it in Settings.` };
  }

  const numericUserId = parseInt(userId, 10);
  if (isNaN(numericUserId)) {
    throw { status: 400, message: 'Invalid user ID format.' };
  }

  const userInGroup = group.users.find(u => u.userId === numericUserId);
  if (!userInGroup) {
    throw { status: 403, message: 'User not authorized for this group' };
  }

  if (!hasGroupPermission(userInGroup.role, requiredRole)) {
    throw { status: 403, message: `User does not have sufficient permission (${requiredRole} required) in this group` };
  }
  return { group, userRoleInGroup: userInGroup.role, groupBasePath };
}

// Helper to check if a path is restricted (now handles nested paths)
function isPathRestricted(relativePath, restrictedSubDirectories) {
  if (!restrictedSubDirectories || restrictedSubDirectories.length === 0) {
    return false;
  }
  // Normalize relativePath: remove leading/trailing slashes, use forward slashes
  const normalizedRelativePath = path.normalize(relativePath || '').replace(/^\\?\/|\\?\/$/g, '').replace(/\\/g, '/');

  // Path cannot be empty string for this check, but if it became empty after normalization (e.g. was just "/"
  // it cannot be a restricted path by name.
  if (normalizedRelativePath === '') return false;

  for (const restrictedDir of restrictedSubDirectories) {
    const normalizedRestrictedDir = path.normalize(restrictedDir || '').replace(/^\\?\/|\\?\/$/g, '').replace(/\\/g, '/');
    if (normalizedRestrictedDir === '') continue; // Skip empty or invalid restricted paths

    // Check for exact match or if relativePath starts with restrictedDir + '/'
    if (normalizedRelativePath === normalizedRestrictedDir || normalizedRelativePath.startsWith(normalizedRestrictedDir + '/')) {
      return true;
    }
  }
  return false;
}

// Ensure directories exist
async function ensureDirectoryExists(dir) {
  try {
    await fs.mkdir(dir, { recursive: true });
    // console.log(`Directory exists or created: ${dir}`);
    return true;
  } catch (error) {
    console.error(`Error creating directory ${dir}:`, error);
    return false;
  }
}

// Initialize non-custom directories
(async () => {
  try {
    // Only create the default directories if needed
    await ensureDirectoryExists(directoryConfig.configDir);
    await ensureDirectoryExists(directoryConfig.tempDir);
    await ensureDirectoryExists(directoryConfig.logsDir);
    
    // If not using custom path, ensure the files directory exists
    if (!directoryConfig.isUsingCustomPath) {
      await ensureDirectoryExists(directoryConfig.filesDir);
      
      // Check if files directory exists and has content
      const files = await fs.readdir(directoryConfig.filesDir)
        .catch(() => []);
      
      // Create some sample directories if empty
      if (files.length === 0) {
        console.log('No files found in directory, creating sample directories');
        const sampleDirs = ['Documents', 'Images', 'Reports'];
        for (const dir of sampleDirs) {
          await ensureDirectoryExists(path.join(directoryConfig.filesDir, dir));
        }
        console.log('Sample directories created');
      }
    } else {
      // When using custom path, check if it exists
      try {
        const stats = await fs.stat(directoryConfig.filesDir);
        if (stats.isDirectory()) {
          // console.log(`Custom directory exists and is accessible: ${directoryConfig.filesDir}`);
          // const files = await fs.readdir(directoryConfig.filesDir);
          // console.log(`Found ${files.length} items in custom directory`);
        } else {
          console.error(`Custom path exists but is not a directory: ${directoryConfig.filesDir}`);
        }
      } catch (error) {
        console.error(`Error accessing custom directory: ${error.message}`);
      }
    }
  } catch (error) {
    console.error('Error initializing directories:', error);
  }
})();

// Configure multer for file uploads - NOW GROUP AWARE
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      const { groupId, directory = '' } = req.query;
      const { group, groupBasePath } = await getGroupUserAndPath(groupId, req.user.id, 'editor');

      if (isPathRestricted(directory, group.restrictedSubDirectories)) {
        return cb(new Error('Upload to this directory is restricted.'));
      }
      
      const targetDir = path.join(groupBasePath, directory);
      await ensureDirectoryExists(targetDir);
      cb(null, targetDir);
    } catch (error) {
      console.error('Multer destination error:', error.message);
      cb(error.status && error.message ? new Error(error.message) : new Error('Failed to determine upload destination.'));
    }
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  }
});

const upload = multer({ 
  storage,
  limits: { 
    fileSize: 300 * 1024 * 1024, // Updated to 300MB
    // files: 50 // This is controlled by upload.array() below, so not strictly needed here but good for clarity
  }
});

// List files in a directory - NOW GROUP AWARE
router.get('/', async (req, res) => {
  try {
    const { groupId, directory = '' } = req.query;
    const { group, groupBasePath } = await getGroupUserAndPath(groupId, req.user.id, 'viewer');

    if (isPathRestricted(directory, group.restrictedSubDirectories)) {
      return res.status(403).json({ message: 'Access to this directory is restricted.' });
    }

    const absoluteDirPath = path.join(groupBasePath, directory);
    const stats = await fs.stat(absoluteDirPath);
    if (!stats.isDirectory()) {
      return res.status(400).json({ message: 'Specified path is not a directory.' });
    }
    
    let items = await fs.readdir(absoluteDirPath, { withFileTypes: true });
    
    // Filter out items that are themselves restricted directories
    const filteredItems = items.filter(item => {
        if (item.isDirectory()) {
            // A directory item should not be listed if its name matches a restricted subdirectory name.
            // The isPathRestricted function checks if the given path (in this case, just the item name)
            // matches any of the restricted directory names (as it checks the first path segment).
            return !isPathRestricted(item.name, group.restrictedSubDirectories);
        }
        return true; // Files are not directly restricted by name, only by their parent directory.
    });

    const filesList = await Promise.all(filteredItems.map(async (item) => {
      const itemPath = path.join(absoluteDirPath, item.name);
      let itemStats; 
      try { itemStats = await fs.stat(itemPath); } 
      catch (err) { itemStats = { size: 0, mtime: new Date(), isDirectory: () => item.isDirectory() }; }
      return {
        name: item.name,
        path: path.join(directory, item.name).replace(/\\/g, '/'),
        isDirectory: item.isDirectory(),
        size: itemStats.size,
        modifiedAt: itemStats.mtime
      };
    }));
    return res.json(filesList);
  } catch (error) {
    console.error('List files error:', error.message);
    if (error.status) return res.status(error.status).json({ message: error.message });
    if (error.code === 'ENOENT') return res.status(404).json({ message: `Directory not found.` });
    return res.status(500).json({ message: 'Server error while listing files.' });
  }
});

// Create directory
router.post('/directory', async (req, res) => {
  try {
    const { name, path: dirRelativePath = '', groupId } = req.body;
    if (!name || name.includes('/') || name.includes('\\') || name.includes('..')) {
        return res.status(400).json({ message: 'Invalid directory name.' });
    }
    const { group, groupBasePath } = await getGroupUserAndPath(groupId, req.user.id, 'editor');
    
    const fullRelativePath = path.join(dirRelativePath, name);
    if (isPathRestricted(fullRelativePath, group.restrictedSubDirectories) || isPathRestricted(dirRelativePath, group.restrictedSubDirectories)) {
      return res.status(403).json({ message: 'Cannot create directory in a restricted location.' });
    }

    const targetPath = path.join(groupBasePath, fullRelativePath);
    if (fsSync.existsSync(targetPath)) {
        return res.status(409).json({ message: 'Directory already exists.' });
    }
    await ensureDirectoryExists(targetPath);
    return res.json({ message: 'Directory created.', path: fullRelativePath.replace(/\\/g, '/'), name, groupId });
  } catch (error) {
    console.error('Create directory error:', error.message);
    if (error.status) return res.status(error.status).json({ message: error.message });
    return res.status(500).json({ message: 'Failed to create directory.' });
  }
});

// Upload files - NOW GROUP AWARE
router.post(
  '/upload',
  // checkSpecificPermission('edit'), // Permission check moved to multer destination and pre-flight
  async (req, res, next) => {
    try {
      const { groupId, directory = '' } = req.query;
      const { group, groupBasePath } = await getGroupUserAndPath(groupId, req.user.id, 'editor');
      if (isPathRestricted(directory, group.restrictedSubDirectories)) {
        return res.status(403).json({ message: 'Upload to this directory is restricted.' });
      }
      // Ensure base path for group is valid before multer tries to use it.
      // This check is implicitly done by getGroupUserAndPath now.
      // const multerDestCheckPath = path.join(groupBasePath, directory);
      // await fs.access(multerDestCheckPath); // Check if multer destination is accessible or can be created
      next();
    } catch (error) {
      console.error('Upload pre-flight error:', error.message);
      if (error.status) return res.status(error.status).json({ message: error.message });
      return res.status(500).json({ message: 'Upload authorization failed.' });
    }
  },
  upload.array('files', 50), 
  handleFileUploadError, 
  (req, res) => {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No files uploaded.' });
    }
    res.status(200).json({ message: `${req.files.length} files uploaded successfully.` });
  }
);

// Download file - NOW GROUP AWARE
router.get('/download/:filePath(*)', async (req, res) => {
  try {
    const { groupId } = req.query;
    const relativeFilePath = req.params.filePath;
    const { group, groupBasePath } = await getGroupUserAndPath(groupId, req.user.id, 'viewer');

    if (isPathRestricted(relativeFilePath, group.restrictedSubDirectories)) {
      return res.status(403).json({ message: 'Access to this file is restricted.' });
    }

    const absoluteFilePath = path.join(groupBasePath, relativeFilePath);
    await fs.access(absoluteFilePath); // Check if file exists and is accessible
    const fileStats = await fs.stat(absoluteFilePath);
    if (fileStats.isDirectory()) {
        return res.status(400).json({ message: 'Path is a directory, not a file.'});
    }

    res.download(absoluteFilePath, path.basename(relativeFilePath), (err) => {
        if (err && !res.headersSent) {
            console.error('Download error (res.download callback):', err.message);
            res.status(500).json({ message: 'Error processing file download.' });
        }
    });
  } catch (error) {
    console.error('Download file error:', error.message);
    if (error.status) return res.status(error.status).json({ message: error.message });
    if (error.code === 'ENOENT') return res.status(404).json({ message: 'File not found.' });
    if (!res.headersSent) {
        res.status(500).json({ message: 'Server error during file download.' });
    }
  }
});

// Download a folder as zip - NOW GROUP AWARE
router.get('/download-folder/:folderPath(*)', async (req, res) => {
  try {
    const { groupId } = req.query;
    const relativeFolderPath = req.params.folderPath || '';
    const { group, groupBasePath } = await getGroupUserAndPath(groupId, req.user.id, 'viewer');

    if (isPathRestricted(relativeFolderPath, group.restrictedSubDirectories)) {
      return res.status(403).json({ message: 'Access to this folder is restricted.' });
    }

    const absoluteSourcePath = path.join(groupBasePath, relativeFolderPath);
    const stats = await fs.stat(absoluteSourcePath);
    if (!stats.isDirectory()) {
      return res.status(400).json({ message: 'Path is not a directory.' });
    }
    
    const folderName = relativeFolderPath ? path.basename(relativeFolderPath) : group.name || 'archive';
    res.attachment(`${folderName}.zip`);
    const archive = archiver('zip', { zlib: { level: 5 } });
    archive.on('error', (err) => { 
        console.error('Archiver error:', err.message);
        if (!res.headersSent) res.status(500).json({ message: 'Error creating zip archive.'}); 
    });
    archive.pipe(res);
    // Add files to archive, but skip any sub-folders that are in restrictedSubDirectories
    // This requires a recursive walk or more complex logic in archiver
    // For now, let's assume if the parent folder is not restricted, we zip its direct contents
    // TODO: Implement filtering of restricted sub-folders during zipping if necessary.
    // For now, if a user can list it, they can zip it (minus its own restricted children not being listed).
    archive.directory(absoluteSourcePath, false); // false means files are at root of zip
    await archive.finalize();
  } catch (error) {
    console.error('Download folder error:', error.message);
    if (error.status) return res.status(error.status).json({ message: error.message });
    if (error.code === 'ENOENT') return res.status(404).json({ message: 'Folder not found.' });
    if (!res.headersSent) res.status(500).json({ message: 'Error downloading folder.' });
  }
});

// Rename a file or folder - NOW GROUP AWARE
router.put('/rename', async (req, res) => {
  try {
    const { oldPath: relativeOldPath, newName, groupId } = req.body;
    if (!relativeOldPath || !newName || newName.includes('/') || newName.includes('\\') || newName.includes('..')) {
      return res.status(400).json({ message: 'Old path and valid new name are required.' });
    }
    const { group, groupBasePath } = await getGroupUserAndPath(groupId, req.user.id, 'editor');

    if (isPathRestricted(relativeOldPath, group.restrictedSubDirectories)) {
      return res.status(403).json({ message: 'Cannot rename a restricted item.' });
    }
    const parentDirRelative = path.dirname(relativeOldPath);
    // Check if the parent directory of the source item is restricted.
    // This check is important if relativeOldPath itself isn't the top-level restricted dir, but is inside one.
    if (parentDirRelative !== '.' && isPathRestricted(parentDirRelative, group.restrictedSubDirectories)) {
        return res.status(403).json({ message: 'Cannot rename item within a restricted directory.'});
    }

    // Construct the new relative path
    const newRelativePath = path.join(parentDirRelative, newName);

    // Check if the new path itself would be a restricted path
    // This handles cases like renaming 'file.txt' to 'RestrictedFolder' at the root,
    // or renaming 'someFolder/item.txt' to 'someFolder/RestrictedItemName' if 'RestrictedItemName' is a restricted name and 'someFolder' is root.
    if (isPathRestricted(newRelativePath, group.restrictedSubDirectories)) {
      return res.status(403).json({ message: 'The new name or path would result in a restricted location.' });
    }

    const absoluteSourcePath = path.join(groupBasePath, relativeOldPath);
    const parentDirAbsolute = path.dirname(absoluteSourcePath);
    const absoluteNewPath = path.join(parentDirAbsolute, newName);
    
    if (!fsSync.existsSync(absoluteSourcePath)) {
      return res.status(404).json({ message: 'Source not found.' });
    }
    if (fsSync.existsSync(absoluteNewPath)) {
      return res.status(409).json({ message: 'Target name already exists.' });
    }
    
    await fs.rename(absoluteSourcePath, absoluteNewPath);
    
    const newPathRelative = path.relative(groupBasePath, absoluteNewPath).replace(/\\/g, '/');
    
    res.json({ message: 'Rename successful.', oldPath: relativeOldPath, newPath: newPathRelative, name: newName });
  } catch (error) {
    console.error('Rename error:', error.message);
    if (error.status) return res.status(error.status).json({ message: error.message });
    res.status(500).json({ message: 'Error renaming item.' });
  }
});

// Delete file/directory - NOW GROUP AWARE
router.delete('/:filePath(*)', async (req, res) => {
  try {
    const { groupId } = req.query;
    const relativeFilePath = req.params.filePath;
    const { group, groupBasePath } = await getGroupUserAndPath(groupId, req.user.id, 'editor');

    if (isPathRestricted(relativeFilePath, group.restrictedSubDirectories)) {
      return res.status(403).json({ message: 'Cannot delete a restricted item or item within a restricted path.' });
    }

    const absoluteFilePath = path.join(groupBasePath, relativeFilePath);
    // console.log(`Attempting to delete item: ${absoluteFilePath} for group ${group.name}`);
    
    const stats = await fs.stat(absoluteFilePath);
    if (stats.isDirectory()) {
      await fs.rm(absoluteFilePath, { recursive: true, force: true });
    } else {
      await fs.unlink(absoluteFilePath);
    }
    
    res.json({ message: `${stats.isDirectory() ? 'Directory' : 'File'} deleted.` });
  } catch (error) {
    console.error('Delete error:', error.message);
    if (error.status) return res.status(error.status).json({ message: error.message });
    if (error.code === 'ENOENT') return res.status(404).json({ message: 'Item not found.' });
    res.status(500).json({ message: 'Error deleting item.' });
  }
});

// Add a new endpoint to get and update directory configuration
router.get('/config', async (req, res) => {
  try {
    console.log('GET /api/files/config - Getting directory configuration');
    
    // Always set the content type to JSON
    res.setHeader('Content-Type', 'application/json');
    
    // Reload the config to ensure we have the latest
    delete require.cache[require.resolve('../config/directoryConfig')];
    const directoryConfig = require('../config/directoryConfig');
    
    const configData = {
      filesDir: directoryConfig.filesDir,
      customDirectoryPath: directoryConfig.customDirectoryPath || '',
      isUsingCustomPath: directoryConfig.isUsingCustomPath
    };
    
    return res.json(configData);
  } catch (error) {
    console.error('Error getting directory config:', error);
    // Still return JSON for errors
    res.status(500).json({ 
      message: 'Error getting directory configuration',
      error: error.message
    });
  }
});

router.post('/config', async (req, res) => {
  try {
    console.log('POST /api/files/config - Updating directory configuration');
    console.log('Request body:', req.body);
    
    const { directoryPath } = req.body;
    
    // Always set the content type to JSON
    res.setHeader('Content-Type', 'application/json');
    
    if (!directoryPath) {
      return res.status(400).json({ message: 'Directory path is required' });
    }
    
    // Validate if the directory exists
    try {
      const stats = await fs.stat(directoryPath);
      if (!stats.isDirectory()) {
        return res.status(400).json({ message: 'Path is not a directory' });
      }
    } catch (error) {
      return res.status(400).json({ 
        message: 'Directory does not exist',
        error: error.message
      });
    }
    
    // Update the config file
    const configPath = path.join(__dirname, '..', 'config', 'directoryConfig.json');
    await fs.writeFile(configPath, JSON.stringify({ directoryPath }, null, 2));
    
    console.log('Updated directory configuration to:', directoryPath);
    
    // Reload the directory config module
    delete require.cache[require.resolve('../config/directoryConfig')];
    const newConfig = require('../config/directoryConfig');
    
    // Return updated configuration
    return res.json({ 
      message: 'Directory configuration updated successfully',
      directoryPath: newConfig.customDirectoryPath,
      filesDir: newConfig.filesDir,
      isUsingCustomPath: newConfig.isUsingCustomPath
    });
  } catch (error) {
    console.error('Error updating directory config:', error);
    // Still return JSON for errors
    return res.status(500).json({ 
      message: 'Error updating directory configuration',
      error: error.message
    });
  }
});

// Helper function to recursively find all subdirectories
async function getAllSubdirectoriesRecursive(basePath, currentRelativePath = '') {
  let allSubdirs = [];
  try {
    const items = await fs.readdir(path.join(basePath, currentRelativePath), { withFileTypes: true });
    for (const item of items) {
      if (item.isDirectory()) {
        const subRelativePath = path.join(currentRelativePath, item.name).replace(/\\/g, '/');
        allSubdirs.push(subRelativePath);
        const nestedSubdirs = await getAllSubdirectoriesRecursive(basePath, subRelativePath);
        allSubdirs = allSubdirs.concat(nestedSubdirs);
      }
    }
  } catch (error) {
    // Ignore errors for individual directory reads (e.g., permission denied for a specific subdir)
    // but log them for debugging
    console.warn(`Warning: Could not read directory ${path.join(basePath, currentRelativePath)} during recursive scan: ${error.message}`);
  }
  return allSubdirs;
}

// Route to get list of ALL subdirectories (recursively) for a group's main path
router.get('/group-subdirectories', async (req, res) => {
  try {
    const { groupId } = req.query;
    if (!groupId) {
      return res.status(400).json({ message: 'Group ID is required.' });
    }

    const { groupBasePath } = await getGroupUserAndPath(groupId, req.user.id, 'viewer');

    // Start recursive scan from the group's base path
    const subdirectories = await getAllSubdirectoriesRecursive(groupBasePath);
    
    // Ensure consistent forward slashes and remove any leading slashes if currentRelativePath starts empty
    const cleanedSubdirectories = subdirectories.map(p => p.replace(/^\//, ''));

    return res.json(cleanedSubdirectories);
  } catch (error) {
    console.error('Error listing group subdirectories recursively:', error.message);
    if (error.status) return res.status(error.status).json({ message: error.message });
    if (error.code === 'ENOENT') return res.status(404).json({ message: `Group path not found or not accessible.` });
    return res.status(500).json({ message: 'Server error while listing group subdirectories.' });
  }
});

module.exports = router;
