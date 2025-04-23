const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;
const fileRoutes = require('./routes/fileRoutes');
const userRoutes = require('./routes/userRoutes');
const authRoutes = require('./routes/authRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS
app.use(cors());

// Parse JSON bodies - make sure this is added before routes
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Add logging middleware for debugging 
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  
  // Log request body for debugging if it's a POST/PUT
  if ((req.method === 'POST' || req.method === 'PUT') && req.body) {
    console.log('Request body:', req.body);
  }
  
  // Ensure JSON content type for API routes
  if (req.path.startsWith('/api/')) {
    res.setHeader('Content-Type', 'application/json');
  }
  
  next();
});

// Request logger
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  next();
});

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/files', fileRoutes);

// API status route
app.get('/api/status', (req, res) => {
  res.json({
    status: 'ok',
    message: 'API is running',
    timestamp: new Date().toISOString()
  });
});

// Default route
app.get('/', (req, res) => {
  res.send('Data View Portal API');
});

// 404 handler
app.use((req, res) => {
  console.log(`Route not found: ${req.method} ${req.url}`);
  res.status(404).json({ message: `Cannot ${req.method} ${req.url}` });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ message: 'Server error' });
});

// Start server
app.listen(PORT, () => {
  const directoryConfig = require('./config/directoryConfig');
  
  console.log(`Server running on port ${PORT}`);
  console.log(`API available at http://localhost:${PORT}/api`);
  console.log(`Using directory path: ${directoryConfig.customDirectoryPath || directoryConfig.filesDir}`);
  
  // Check if the directory exists
  const fs = require('fs');
  try {
    const dirPath = directoryConfig.customDirectoryPath || directoryConfig.filesDir;
    const stats = fs.statSync(dirPath);
    if (stats.isDirectory()) {
      console.log(`Directory exists and is accessible: ${dirPath}`);
      // List a few files as a test
      const files = fs.readdirSync(dirPath).slice(0, 5);
      console.log(`Sample files in directory: ${files.join(', ')}`);
    } else {
      console.error(`Path exists but is not a directory: ${dirPath}`);
    }
  } catch (error) {
    console.error(`Error accessing directory: ${error.message}`);
  }
});

module.exports = app;
