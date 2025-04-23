const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { checkPermission } = require('../middleware/permissions');
const fileController = require('../controllers/fileController');

// All file routes require authentication
router.use(auth);

// List files and directories - All authenticated users
router.get('/', fileController.listFiles);

// Upload files - Editor and Admin only
router.post('/upload', checkPermission('editor'), fileController.uploadFiles, fileController.upload);

// Download file - All authenticated users
router.get('/download/:path(*)', fileController.downloadFile);

// Download folder - All authenticated users
router.get('/download-folder/:path(*)', fileController.downloadFolder);

// Delete file or directory - Editor and Admin only
router.delete('/:path(*)', checkPermission('editor'), fileController.deleteItem);

// Create new directory - Editor and Admin only
router.post('/directory', checkPermission('editor'), fileController.createDirectory);

// Rename file or directory - Editor and Admin only
router.put('/rename', checkPermission('editor'), fileController.renameItem);

// Directory operations
router.get('/get-directory', (req, res) => {
    // Implement directory get logic or use controller
    res.json({ message: 'Not implemented yet' });
});

router.post('/set-directory', (req, res) => {
    // Implement directory set logic or use controller
    res.json({ message: 'Not implemented yet' });
});

module.exports = router;
