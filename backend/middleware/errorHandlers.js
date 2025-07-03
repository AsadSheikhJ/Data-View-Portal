const multer = require('multer'); // Add this at the top

function handleFileUploadError(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        error: 'File too large',
        maxSize: '300MB'
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(413).json({
        error: 'Too many files',
        maxFiles: 50
      });
    }
    return res.status(400).json({ error: err.message });
  }
  next(err);
}

module.exports = { handleFileUploadError };
