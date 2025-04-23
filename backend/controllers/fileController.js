const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { uploadsDir } = require('../config/config');
const archiver = require('archiver');
const { checkPermission } = require('../middleware/permissions');

// Function to get the configured root directory or fallback to the default
const getRootDirectory = () => {
  const configFilePath = path.join(__dirname, '../config/directoryConfig.json');
  if (fs.existsSync(configFilePath)) {
    try {
      const config = JSON.parse(fs.readFileSync(configFilePath, 'utf-8'));
      if (config.directoryPath && fs.existsSync(config.directoryPath)) {
        return config.directoryPath;
      }
    } catch (error) {
      console.error('Error reading directory config:', error);
    }
  }
  return uploadsDir;
};

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const rootDir = getRootDirectory();
    let uploadPath = rootDir;
    let dir = req.query.directory || '';
    // Normalize to forward slashes and remove leading/trailing slashes
    dir = dir.replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
    if (dir) {
      uploadPath = path.join(rootDir, dir);
      if (!fs.existsSync(uploadPath)) {
        fs.mkdirSync(uploadPath, { recursive: true });
      }
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Keep original filename
    cb(null, file.originalname);
  }
});

// Initialize multer upload
const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 } // 100 MB file size limit
});

// Export multer middleware
exports.uploadFiles = upload.array('files', 10); // Accept up to 10 files

// List files and directories
exports.listFiles = (req, res) => {
  try {
    // Permission check is now handled by middleware
    const rootDir = getRootDirectory();
    const directory = req.query.directory || '';
    const fullPath = path.join(rootDir, directory);
    
    // Check if directory exists
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ message: 'Directory not found' });
    }
    
    // Read directory contents
    const items = fs.readdirSync(fullPath, { withFileTypes: true });
    
    // Transform to appropriate format with metadata
    const fileList = items.map(item => {
      const isDirectory = item.isDirectory();
      const itemPath = path.join(fullPath, item.name);
      const stats = fs.statSync(itemPath);
      
      return {
        name: item.name,
        path: path.join(directory, item.name),
        isDirectory,
        size: isDirectory ? null : stats.size,
        lastModified: stats.mtime,
        type: isDirectory ? 'directory' : path.extname(item.name).slice(1) || 'file'
      };
    });
    
    res.json({
      path: directory,
      files: fileList
    });
  } catch (error) {
    console.error('Error listing files:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Upload files
exports.upload = (req, res) => {
  if (req.user.role === 'editor' || req.user.role === 'admin') {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'No files uploaded' });
    }
  
    res.status(200).json({ message: 'Files uploaded successfully', files: req.files });
  } else {
    return res.status(403).json({ message: 'Insufficient permissions' });
  }
};

// Download file
exports.downloadFile = (req, res) => {
  try {
    // Only allow viewers and above
    if (req.user.role === 'viewer' || req.user.role === 'editor' || req.user.role === 'admin') {
      const rootDir = getRootDirectory();
      const filePath = path.join(rootDir, req.params.path);
      
      // Check if file exists
      if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
        return res.status(404).json({ message: 'File not found' });
      }
      
      const filename = path.basename(filePath);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Type', 'application/octet-stream');
      
      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
    } else {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }
  } catch (error) {
    console.error('Error downloading file:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Download folder
exports.downloadFolder = (req, res) => {
  try {
    // Only allow viewers and above
    if (req.user.role === 'viewer' || req.user.role === 'editor' || req.user.role === 'admin') {
      const rootDir = getRootDirectory();
      const folderPath = path.join(rootDir, req.params.path);
  
      // Check if folder exists
      if (!fs.existsSync(folderPath) || !fs.statSync(folderPath).isDirectory()) {
        return res.status(404).json({ message: 'Folder not found' });
      }
  
      const zipFileName = `${path.basename(folderPath)}.zip`;
      res.setHeader('Content-Disposition', `attachment; filename="${zipFileName}"`);
      res.setHeader('Content-Type', 'application/zip');
  
      const archive = archiver('zip', { zlib: { level: 9 } });
      archive.on('error', (err) => {
        throw err;
      });
  
      archive.pipe(res);
      archive.directory(folderPath, false);
      archive.finalize();
    } else {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }
  } catch (error) {
    console.error('Error downloading folder:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Delete file or directory
exports.deleteItem = (req, res) => {
  try {
    // Only allow editors and above
    if (req.user.role === 'editor' || req.user.role === 'admin') {
      const rootDir = getRootDirectory();
      const itemPath = path.join(rootDir, req.params.path);
      
      // Check if item exists
      if (!fs.existsSync(itemPath)) {
        return res.status(404).json({ message: 'File or directory not found' });
      }
      
      const isDirectory = fs.statSync(itemPath).isDirectory();
      
      if (isDirectory) {
        // Remove directory recursively
        fs.rmdirSync(itemPath, { recursive: true });
      } else {
        // Remove file
        fs.unlinkSync(itemPath);
      }
      
      res.json({ message: `${isDirectory ? 'Directory' : 'File'} deleted successfully` });
    } else {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }
  } catch (error) {
    console.error('Error deleting item:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Create new directory
exports.createDirectory = (req, res) => {
  try {
    // Only allow editors and above
    if (req.user.role === 'editor' || req.user.role === 'admin') {
      const rootDir = getRootDirectory();
      const { path: directoryPath, name } = req.body;
      
      if (!name) {
        return res.status(400).json({ message: 'Directory name is required' });
      }
      
      const fullPath = path.join(rootDir, directoryPath || '', name);
      
      // Check if directory already exists
      if (fs.existsSync(fullPath)) {
        return res.status(400).json({ message: 'Directory already exists' });
      }
      
      // Create directory
      fs.mkdirSync(fullPath, { recursive: true });
      
      res.status(201).json({
        message: 'Directory created successfully',
        directory: {
          name,
          path: path.join(directoryPath || '', name).replace(/\\/g, '/'),
          isDirectory: true
        }
      });
    } else {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }
  } catch (error) {
    console.error('Error creating directory:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

// Rename file or directory
exports.renameItem = (req, res) => {
  try {
    // Only allow editors and above
    if (req.user.role === 'editor' || req.user.role === 'admin') {
      const rootDir = getRootDirectory();
      const { path: itemPath, newName } = req.body;
      
      if (!newName) {
        return res.status(400).json({ message: 'New name is required' });
      }
      
      const fullPath = path.join(rootDir, itemPath);
      
      // Check if item exists
      if (!fs.existsSync(fullPath)) {
        return res.status(404).json({ message: 'File or directory not found' });
      }
      
      const directory = path.dirname(itemPath);
      const newPath = path.join(rootDir, directory, newName);
      
      // Check if destination already exists
      if (fs.existsSync(newPath)) {
        return res.status(400).json({ message: 'A file or directory with this name already exists' });
      }
      
      // Rename file or directory
      fs.renameSync(fullPath, newPath);
      
      const isDirectory = fs.statSync(newPath).isDirectory();
      
      res.json({
        message: `${isDirectory ? 'Directory' : 'File'} renamed successfully`,
        item: {
          name: newName,
          path: path.join(directory, newName).replace(/\\/g, '/'),
          isDirectory
        }
      });
    } else {
      return res.status(403).json({ message: 'Insufficient permissions' });
    }
  } catch (error) {
    console.error('Error renaming item:', error);
    res.status(500).json({ message: 'Server error' });
  }
};