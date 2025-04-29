const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/')
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname))
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB file size limit
    files: 10 // Maximum 10 files
  },
  fileFilter: (req, file, cb) => {
    // Add any file type restrictions if needed
    cb(null, true);
  }
});

module.exports = upload;
