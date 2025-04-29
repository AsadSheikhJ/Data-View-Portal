const multer = require('multer'); // Add this at the top

function handleFileUploadError(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        error: 'File too large',
        maxSize: '100MB'
      });
    }
    return res.status(400).json({ error: err.message });
  }
  next(err);
}

module.exports = { handleFileUploadError };
