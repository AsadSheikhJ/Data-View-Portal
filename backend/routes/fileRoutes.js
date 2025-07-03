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

// Debug the directory configuration
console.log('Files directory path:', directoryConfig.filesDir);
// console.log('Using custom path:', directoryConfig.isUsingCustomPath ? 'Yes' : 'No');

// Centralized helper to get group, validate user, and get group's base path
// Now checks against req.user.permissions based on requiredPermissionKey
async function getGroupUserAndPath(groupId, accessingUser, requiredPermissionKey) {
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

  const numericUserId = parseInt(accessingUser.id, 10);
  if (isNaN(numericUserId)) {
    throw { status: 400, message: 'Invalid user ID format.' };
  }

  const userInGroup = group.users.find(u => u.userId === numericUserId);
  if (!userInGroup) {
    throw { status: 403, message: 'User not authorized for this group' };
  }

  if (!accessingUser.permissions) {
      throw { status: 403, message: 'User permissions not defined.' };
  }

  // --- Add these debug logs ---
  console.log(`[Debug FileRoutes] getGroupUserAndPath for user ID ${accessingUser.id}, attempting operation requiring: '${requiredPermissionKey}'`);
  console.log(`[Debug FileRoutes] Full User Permissions Object (from req.user.permissions):`, JSON.stringify(accessingUser.permissions, null, 2));
  if (requiredPermissionKey && accessingUser.permissions.hasOwnProperty(requiredPermissionKey)) {
    console.log(`[Debug FileRoutes] Value of required permission key '${requiredPermissionKey}':`, accessingUser.permissions[requiredPermissionKey]);
  } else if (requiredPermissionKey) {
    console.log(`[Debug FileRoutes] Required permission key '${requiredPermissionKey}' is NOT present in user permissions object.`);
  }
  // --- End of debug logs ---

  let hasPermission = false;
  let permissionErrorMessage = 'User does not have sufficient permission for this operation.';

  switch (requiredPermissionKey) {
    case 'view':
      if (accessingUser.permissions.view) {
        hasPermission = true;
      } else {
        permissionErrorMessage = 'User does not have permission to view files/directories.';
      }
      break;
    case 'download':
      if (accessingUser.permissions.download) { // Assuming download implies view or view is checked by client
        hasPermission = true;
      } else {
        permissionErrorMessage = 'User does not have permission to download files.';
      }
      break;
    case 'edit':
      if (accessingUser.permissions.edit) {
        hasPermission = true;
      } else {
        permissionErrorMessage = 'User does not have permission to modify files/directories.';
      }
      break;
    default:
      console.warn(`Unknown requiredPermissionKey in getGroupUserAndPath: ${requiredPermissionKey}`);
      permissionErrorMessage = 'Internal error: Invalid permission key for operation.';
      // Keep hasPermission = false
      break;
  }

  if (!hasPermission) {
    throw { status: 403, message: permissionErrorMessage };
  }

  // userInGroup.role from groups.json is not used here for gating file operations
  return { group, userInGroup, groupBasePath };
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
      // Use 'edit' permission for uploading
      const { group, groupBasePath } = await getGroupUserAndPath(groupId, req.user, 'edit');

      if (isPathRestricted(directory, group.restrictedSubDirectories)) {
        return cb(new Error('Upload to this directory is restricted.'));
      }
      
      const targetDir = path.join(groupBasePath, directory);
      await ensureDirectoryExists(targetDir);
      cb(null, targetDir);
    } catch (error) {
      console.error('Multer destination error:', error.message);
      const errToSend = error.status && error.message ? new Error(error.message) : new Error('Failed to determine upload destination.');
      errToSend.status = error.status || 500;
      cb(errToSend);
    }
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  }
});

const upload = multer({ 
  storage,
  limits: { 
    fileSize: 300 * 1024 * 1024,
  }
});

// List files in a directory - NOW GROUP AWARE
router.get('/', async (req, res) => {
  try {
    const { groupId, directory = '' } = req.query;
    const { group, groupBasePath } = await getGroupUserAndPath(groupId, req.user, 'view');

    // This check remains: if the CURRENT directory being listed is restricted, block access.
    if (isPathRestricted(directory, group.restrictedSubDirectories)) {
      return res.status(403).json({ message: 'Access to this directory is restricted.' });
    }

    const absoluteDirPath = path.join(groupBasePath, directory);
    const stats = await fs.stat(absoluteDirPath);
    if (!stats.isDirectory()) {
      return res.status(400).json({ message: 'Specified path is not a directory.' });
    }
    
    let items = await fs.readdir(absoluteDirPath, { withFileTypes: true });

    // Filter out hidden files and folders (those starting with a dot)
    items = items.filter(item => !item.name.startsWith('.'));
    
    const filesList = await Promise.all(items.map(async (item) => {
      const itemRelativePath = path.join(directory, item.name).replace(/\\/g, '/');
      let itemStats; 
      try { itemStats = await fs.stat(path.join(groupBasePath, itemRelativePath)); } 
      catch (err) { 
        console.warn(`Could not stat item ${path.join(groupBasePath, itemRelativePath)}: ${err.message}. Using defaults.`);
        itemStats = { size: 0, mtime: new Date(), isDirectory: () => item.isDirectory() }; 
      }

      // Determine if this item, if it's a directory, would be restricted to enter
      const isItemPotentiallyRestricted = item.isDirectory() && isPathRestricted(itemRelativePath, group.restrictedSubDirectories);

      return {
        name: item.name,
        path: itemRelativePath,
        isDirectory: item.isDirectory(),
        size: itemStats.size,
        modifiedAt: itemStats.mtime,
        isRestricted: isItemPotentiallyRestricted // ADDED THIS PROPERTY
      };
    }));
    return res.json(filesList);
  } catch (error) {
    console.error('List files error:', error.message);
    if (error.status) return res.status(error.status).json({ message: error.message });
    if (error.code === 'ENOENT') return res.status(404).json({ message: 'Directory not found.' });
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
    // Use 'edit' permission for creating directories
    const { group, groupBasePath } = await getGroupUserAndPath(groupId, req.user, 'edit');
    
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

// Upload multiple files
router.post('/upload', upload.array('files', 50), handleFileUploadError, async (req, res) => {
  // Permission is already checked by multer's storage destination function using getGroupUserAndPath with 'edit'
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ message: 'No files uploaded.' });
  }
  res.status(200).json({ message: 'Files uploaded successfully!', count: req.files.length, files: req.files.map(f => f.originalname) });
});

// Download a file
router.get('/download/:filePath(*)', async (req, res) => {
  try {
    const filePath = req.params.filePath;
    const { groupId } = req.query;
    // Use 'download' permission for downloading files
    const { group, groupBasePath } = await getGroupUserAndPath(groupId, req.user, 'download');

    if (isPathRestricted(filePath, group.restrictedSubDirectories)) {
      return res.status(403).json({ message: 'Access to this file is restricted.' });
    }

    const absoluteFilePath = path.join(groupBasePath, filePath);
    await fs.access(absoluteFilePath); // Check if file exists and is accessible
    const fileStats = await fs.stat(absoluteFilePath);
    if (fileStats.isDirectory()) {
        return res.status(400).json({ message: 'Path is a directory, not a file.'});
    }

    if (!fsSync.existsSync(absoluteFilePath) || !fsSync.statSync(absoluteFilePath).isFile()) {
        return res.status(404).json({ message: 'File not found or is not a file.' });
    }
    res.download(absoluteFilePath, path.basename(absoluteFilePath), (err) => {
      if (err) {
        console.error("Download error:", err);
        // Avoid sending another response if headers already sent (e.g., by res.download itself on error)
        if (!res.headersSent) {
            // Check for specific errors if needed, e.g., access errors
            if (err.code === 'ECONNABORTED' || err.code === 'ERR_STREAM_PREMATURE_CLOSE') {
                // These might indicate client closed connection, less of a server error
                console.warn('Client aborted download or stream closed prematurely for:', filePath);
            } else {
                res.status(500).send('Error during file download.');
            }
        }
      }
    });
  } catch (error) {
    console.error('Download file error:', error.message);
    if (error.status) return res.status(error.status).json({ message: error.message });
    if (error.code === 'ENOENT') return res.status(404).json({ message: 'File path not found.' });
    return res.status(500).json({ message: 'Server error while downloading file.' });
  }
});

// Download a folder as a zip
router.get('/download-folder/:folderPath(*)', async (req, res) => {
  const folderPath = req.params.folderPath;
  const { groupId } = req.query;
  try {
    // Use 'download' permission for downloading folders
    const { group, groupBasePath } = await getGroupUserAndPath(groupId, req.user, 'download');
    
    const absoluteFolderPath = path.join(groupBasePath, folderPath);

    if (isPathRestricted(folderPath, group.restrictedSubDirectories)) {
      return res.status(403).json({ message: 'Access to this folder is restricted.' });
    }

    const stats = await fs.stat(absoluteFolderPath);
    if (!stats.isDirectory()) {
      return res.status(400).json({ message: 'Path is not a directory.' });
    }
    
    const folderName = folderPath ? path.basename(folderPath) : group.name || 'archive';
    res.attachment(`${folderName}.zip`);
    const archive = archiver('zip', { zlib: { level: 9 } });
    archive.on('error', function(err) {
      console.error('Archiver error:', err);
      if (!res.headersSent) {
        res.status(500).send({ error: 'Failed to create archive.', details: err.message });
      }
    });
    archive.on('warning', function(err) {
      if (err.code === 'ENOENT') {
        console.warn('Archiver warning (ENOENT):', err);
      } else {
        console.warn('Archiver warning:', err);
      }
    });

    res.attachment(`${path.basename(folderPath) || 'archive'}.zip`);
    archive.pipe(res);
    archive.directory(absoluteFolderPath, false);
    await archive.finalize();

  } catch (error) {
    console.error(`Error downloading folder ${folderPath}:`, error.message);
    if (!res.headersSent) {
        if (error.status) return res.status(error.status).json({ message: error.message });
        if (error.code === 'ENOENT') return res.status(404).json({ message: 'Folder not found.' });
        return res.status(500).json({ message: 'Server error while downloading folder.' });
    }
  }
});

// Delete a file or directory
router.delete('/:filePath(*)', async (req, res) => {
  try {
    const filePath = req.params.filePath;
    const { groupId } = req.query;
    // Use 'edit' permission for deleting
    const { group, groupBasePath } = await getGroupUserAndPath(groupId, req.user, 'edit');

    if (isPathRestricted(filePath, group.restrictedSubDirectories)) {
      return res.status(403).json({ message: 'Deletion in this location is restricted.' });
    }

    const absoluteFilePath = path.join(groupBasePath, filePath);
    // console.log(`Attempting to delete item: ${absoluteFilePath} for group ${group.name}`);
    
    const stats = await fs.stat(absoluteFilePath);
    if (stats.isDirectory()) {
      await fs.rm(absoluteFilePath, { recursive: true, force: true });
    } else {
      await fs.unlink(absoluteFilePath);
    }
    
    res.json({ message: `${stats.isDirectory() ? 'Directory' : 'File'} deleted.` });
  } catch (error) {
    console.error('Delete item error:', error.message);
    if (error.status) return res.status(error.status).json({ message: error.message });
    if (error.code === 'ENOENT') return res.status(404).json({ message: 'Item not found.' });
    res.status(500).json({ message: 'Server error while deleting item.' });
  }
});

// Rename a file or folder
router.put('/rename', async (req, res) => {
  try {
    const { oldPath, newName, groupId } = req.body;
    if (!oldPath || !newName || newName.includes('/') || newName.includes('\\') || newName.includes('..')) {
      return res.status(400).json({ message: 'Invalid old path or new name.' });
    }
    // Use 'edit' permission for renaming
    const { group, groupBasePath } = await getGroupUserAndPath(groupId, req.user, 'edit');

    if (isPathRestricted(oldPath, group.restrictedSubDirectories)) {
      return res.status(403).json({ message: 'Cannot rename item in a restricted location.' });
    }
    const parentDir = path.dirname(oldPath);
    const newPath = path.join(parentDir, newName);
    if (isPathRestricted(newPath, group.restrictedSubDirectories)) {
        return res.status(403).json({ message: 'Cannot rename item to a restricted location or name.' });
    }

    const absoluteOldPath = path.join(groupBasePath, oldPath);
    const absoluteNewPath = path.join(groupBasePath, newPath);
    
    if (!fsSync.existsSync(absoluteOldPath)) {
      return res.status(404).json({ message: 'Source not found.' });
    }
    if (fsSync.existsSync(absoluteNewPath)) {
      return res.status(409).json({ message: 'Target name already exists.' });
    }
    
    await fs.rename(absoluteOldPath, absoluteNewPath);
    
    const newPathRelative = path.relative(groupBasePath, absoluteNewPath).replace(/\\/g, '/');
    
    res.json({ message: 'Rename successful.', oldPath: oldPath, newPath: newPathRelative, name: newName });
  } catch (error) {
    console.error('Rename item error:', error.message);
    if (error.status) return res.status(error.status).json({ message: error.message });
    if (error.code === 'ENOENT') return res.status(404).json({ message: 'Item not found.' });
    res.status(500).json({ message: 'Server error while renaming item.' });
  }
});

// GET group-specific subdirectories (for restriction UI)
// This route is special: it should be callable by an admin user (who might not be in the group)
// OR by a group member with sufficient rights to see the structure.
// For now, let's assume an admin role is sufficient globally, or a group member for their own group.
router.get('/group-subdirectories', async (req, res) => {
// ... (this route's permission logic might need separate review if it's not just for group members) ...
// For now, keeping its existing permission logic for consistency,
// assuming 'view' is what it implies for a group member.
// If an admin needs to see this for ANY group, that's a different check.
  try {
    const { groupId } = req.query;
    if (!req.user || !req.user.id) {
        return res.status(401).json({ message: 'User authentication required.'});
    }
    // Let's use 'view' permission to see subdirectories of a group one belongs to.
    // Admins might have broader access, but this route primarily serves group members for restriction setup context.
    const { group, groupBasePath } = await getGroupUserAndPath(groupId, req.user, 'view');
    
    const subdirectories = await getAllSubdirectoriesRecursive(groupBasePath);
    res.json(subdirectories);
  } catch (error) {
    console.error('Error fetching group subdirectories:', error);
    if (error.status) return res.status(error.status).json({ message: error.message });
    return res.status(500).json({ message: 'Failed to fetch group subdirectories.' });
  }
});

// Helper function to recursively find all subdirectories
async function getAllSubdirectoriesRecursive(basePath, currentRelativePath = '') {
    const fullPath = path.join(basePath, currentRelativePath);
    let entries;
    try {
        entries = await fs.readdir(fullPath, { withFileTypes: true });
    } catch (error) {
        // If we can't read a directory (e.g., permissions), we can't find subdirectories in it.
        console.warn(`Could not read directory ${fullPath}: ${error.message}. Skipping.`);
        return [];
    }

    const subdirectories = [];

    for (const entry of entries) {
        // Filter out hidden files and folders
        if (entry.isDirectory() && !entry.name.startsWith('.')) {
            const newRelativePath = path.join(currentRelativePath, entry.name).replace(/\\\\/g, '/');
            subdirectories.push(newRelativePath);
            // Recursively find more subdirectories
            const nestedSubdirs = await getAllSubdirectoriesRecursive(basePath, newRelativePath);
            subdirectories.push(...nestedSubdirs);
        }
    }

    return subdirectories;
}

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

module.exports = router;
