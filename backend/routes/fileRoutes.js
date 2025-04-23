const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs').promises;
const multer = require('multer');
const directoryConfig = require('../config/directoryConfig');

// Debug the directory configuration
console.log('Files directory path:', directoryConfig.filesDir);
console.log('Using custom path:', directoryConfig.isUsingCustomPath ? 'Yes' : 'No');

// Ensure directories exist
async function ensureDirectoryExists(dir) {
  try {
    await fs.mkdir(dir, { recursive: true });
    console.log(`Directory exists or created: ${dir}`);
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
          console.log(`Custom directory exists and is accessible: ${directoryConfig.filesDir}`);
          const files = await fs.readdir(directoryConfig.filesDir);
          console.log(`Found ${files.length} items in custom directory`);
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

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    try {
      let targetDir;
      const directory = req.query.directory || '';
      
      if (directory) {
        // If directory is specified, append it to the base path
        targetDir = path.join(directoryConfig.filesDir, directory);
      } else {
        // Otherwise just use the base files directory
        targetDir = directoryConfig.filesDir;
      }
      
      console.log(`Upload destination directory: ${targetDir}`);
      await ensureDirectoryExists(targetDir);
      cb(null, targetDir);
    } catch (error) {
      console.error('Multer destination error:', error);
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// List files in a directory
router.get('/', async (req, res) => {
  try {
    // Reload config to get the latest directory path
    delete require.cache[require.resolve('../config/directoryConfig')];
    const directoryConfig = require('../config/directoryConfig');
    
    const directory = req.query.directory || '';
    
    let dirPath;
    if (directory) {
      dirPath = path.join(directoryConfig.filesDir, directory);
    } else {
      dirPath = directoryConfig.filesDir;
    }
    
    console.log(`Listing files in: ${dirPath}`);
    
    try {
      // Check if directory exists
      const stats = await fs.stat(dirPath);
      if (!stats.isDirectory()) {
        console.error(`Path is not a directory: ${dirPath}`);
        return res.json([]);
      }
      
      // Read directory contents
      const items = await fs.readdir(dirPath, { withFileTypes: true });
      console.log(`Found ${items.length} items in directory: ${dirPath}`);
      
      // Generate file objects
      const filesList = await Promise.all(items.map(async (item) => {
        const itemPath = path.join(dirPath, item.name);
        let stats;
        
        try {
          stats = await fs.stat(itemPath);
        } catch (error) {
          console.error(`Cannot stat ${itemPath}:`, error);
          stats = { size: 0, mtime: new Date() };
        }
        
        // Calculate relative path for client
        let relativePath;
        if (directory) {
          relativePath = path.join(directory, item.name).replace(/\\/g, '/');
        } else {
          relativePath = item.name;
        }
        
        return {
          name: item.name,
          path: relativePath,
          isDirectory: item.isDirectory(),
          size: stats.size,
          modifiedAt: stats.mtime
        };
      }));
      
      return res.json(filesList);
    } catch (error) {
      console.error(`Error reading directory ${dirPath}:`, error);
      return res.json([]);
    }
  } catch (error) {
    console.error('Error in list files route:', error);
    return res.json([]);
  }
});

// Create directory
router.post('/directory', async (req, res) => {
  try {
    const { name, path: dirPath } = req.body;
    
    if (!name && !dirPath) {
      return res.status(400).json({ message: 'Directory name or path is required' });
    }
    
    let targetPath;
    if (dirPath) {
      // If path is provided, join with base dir
      targetPath = path.join(directoryConfig.filesDir, dirPath);
    } else {
      // Otherwise just use name
      targetPath = path.join(directoryConfig.filesDir, name);
    }
    
    console.log(`Creating directory: ${targetPath}`);
    
    await ensureDirectoryExists(targetPath);
    
    const relativePath = path.relative(directoryConfig.filesDir, targetPath).replace(/\\/g, '/');
    return res.json({
      message: 'Directory created successfully',
      path: relativePath,
      name: path.basename(targetPath)
    });
  } catch (error) {
    console.error('Error creating directory:', error);
    return res.status(500).json({ 
      message: 'Failed to create directory',
      error: error.message 
    });
  }
});

// Upload file
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }
    
    const filePath = req.file.path;
    // Calculate relative path based on whether we're using custom directory
    const basePath = directoryConfig.customDirectoryPath || directoryConfig.filesDir;
    const relativePath = path.relative(basePath, filePath).replace(/\\/g, '/');
    
    res.json({
      name: req.file.originalname,
      path: relativePath,
      size: req.file.size,
      message: 'File uploaded successfully'
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    res.status(500).json({ message: 'Error uploading file' });
  }
});

// Download file
router.get('/download/:filePath(*)', async (req, res) => {
  try {
    const basePath = directoryConfig.customDirectoryPath || directoryConfig.filesDir;
    const filePath = path.join(basePath, req.params.filePath);
    
    console.log(`Downloading file: ${filePath}`);
    
    // Check if file exists
    await fs.access(filePath);
    res.download(filePath);
  } catch (error) {
    console.error('Error downloading file:', error);
    res.status(404).json({ message: 'File not found' });
  }
});

// Delete file/directory
router.delete('/:filePath(*)', async (req, res) => {
  try {
    const basePath = directoryConfig.customDirectoryPath || directoryConfig.filesDir;
    const filePath = path.join(basePath, req.params.filePath);
    
    console.log(`Deleting item: ${filePath}`);
    
    // Check if path exists
    const stats = await fs.stat(filePath);
    
    if (stats.isDirectory()) {
      await fs.rm(filePath, { recursive: true, force: true });
    } else {
      await fs.unlink(filePath);
    }
    
    res.json({ message: `${stats.isDirectory() ? 'Directory' : 'File'} deleted successfully` });
  } catch (error) {
    console.error('Error deleting item:', error);
    res.status(500).json({ message: 'Error deleting item' });
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
    
    console.log('Sending directory config:', configData);
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
