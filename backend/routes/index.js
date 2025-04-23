const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

// Directory configuration file
const configFilePath = path.join(__dirname, '../config/directoryConfig.json');

/* GET home page. */
router.get('/', function(req, res, next) {
  res.json({ title: 'File Manager API', message: 'Welcome to the File Manager API' });
});

// Route to set the directory path
router.post('/set-directory', (req, res) => {
  const { directoryPath } = req.body;

  // Validate the directory path
  if (!fs.existsSync(directoryPath)) {
    return res.status(400).json({ error: 'Directory does not exist' });
  }

  // Save the directory path to the configuration file
  fs.writeFileSync(configFilePath, JSON.stringify({ directoryPath }, null, 2));

  res.status(200).json({ message: 'Directory path updated successfully' });
});

// Route to get the configured directory path
router.get('/get-directory', (req, res) => {
  if (!fs.existsSync(configFilePath)) {
    return res.status(404).json({ error: 'No directory configured' });
  }

  const config = JSON.parse(fs.readFileSync(configFilePath, 'utf-8'));
  res.status(200).json(config);
});

module.exports = router;
