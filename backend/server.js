const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;
const http = require('http');
const net = require('net');
const fileRoutes = require('./routes/fileRoutes');
const userRoutes = require('./routes/userRoutes');
const authRoutes = require('./routes/authRoutes');

const app = express();
let PORT = process.env.PORT || 5000;

// Function to check if a port is in use
const isPortInUse = async (port) => {
  return new Promise((resolve) => {
    const server = net.createServer();
    
    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        resolve(true);
      } else {
        resolve(false);
      }
      server.close();
    });
    
    server.once('listening', () => {
      server.close();
      resolve(false);
    });
    
    server.listen(port);
  });
};

// Function to find an available port starting from the specified one
const findAvailablePort = async (startPort) => {
  let port = startPort;
  while (await isPortInUse(port)) {
    console.log(`Port ${port} is in use, trying next port...`);
    port++;
  }
  return port;
};

// Enable CORS
const corsOptions = require('./config/cors');
app.use(cors(corsOptions));

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

// Add direct endpoints for file configuration - place this BEFORE the router registration
app.get('/api/files/config', (req, res) => {
  try {
    console.log('GET /api/files/config endpoint called directly');
    
    const path = require('path');
    const fs = require('fs');
    
    // Read the configuration file directly
    const configPath = path.join(__dirname, 'config', 'directoryConfig.json');
    let customDirectoryPath = '';
    
    if (fs.existsSync(configPath)) {
      try {
        const configContent = fs.readFileSync(configPath, 'utf8');
        const config = JSON.parse(configContent);
        customDirectoryPath = config.directoryPath || '';
      } catch (parseError) {
        console.error('Error parsing config file:', parseError);
      }
    } else {
      console.log('Config file not found at:', configPath);
    }
    
    // Use the custom path or default
    const dataDir = path.join(__dirname, 'data');
    const filesDir = customDirectoryPath || path.join(dataDir, 'files');
    
    // Response data
    const configData = {
      filesDir,
      customDirectoryPath,
      isUsingCustomPath: !!customDirectoryPath
    };
    
    res.json(configData);
  } catch (error) {
    console.error('Error in GET /api/files/config:', error);
    res.status(500).json({
      message: 'Error getting directory configuration',
      error: error.toString()
    });
  }
});

app.post('/api/files/config', (req, res) => {
  try {
    console.log('POST /api/files/config endpoint called directly');
    console.log('Request body:', req.body);
    
    const { directoryPath } = req.body;
    
    if (!directoryPath) {
      return res.status(400).json({ message: 'Directory path is required' });
    }
    
    // Validate directory
    const fs = require('fs');
    const path = require('path');
    
    try {
      const stats = fs.statSync(directoryPath);
      if (!stats.isDirectory()) {
        return res.status(400).json({ message: 'Path is not a directory' });
      }
    } catch (fsError) {
      return res.status(400).json({ 
        message: 'Directory does not exist',
        error: fsError.toString()
      });
    }
    
    // Save configuration
    const configDir = path.join(__dirname, 'config');
    const configPath = path.join(configDir, 'directoryConfig.json');
    
    // Create config directory if it doesn't exist
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    
    // Write config file
    fs.writeFileSync(configPath, JSON.stringify({ directoryPath }, null, 2));
    console.log(`Updated directory config to: ${directoryPath}`);
    
    res.json({
      message: 'Directory configuration updated successfully',
      filesDir: directoryPath,
      customDirectoryPath: directoryPath,
      isUsingCustomPath: true
    });
  } catch (error) {
    console.error('Error in POST /api/files/config:', error);
    res.status(500).json({
      message: 'Error updating directory configuration',
      error: error.toString()
    });
  }
});

// API routes - must come AFTER the direct endpoints
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
const startServer = async () => {
  PORT = await findAvailablePort(PORT);
  const server = app.listen(PORT, '0.0.0.0', () => {
    const directoryConfig = require('./config/directoryConfig');
    const networkInfo = require('./utils/networkInfo');
    
    // Display network access information
    networkInfo.printAccessUrls(PORT);
    
    // Check if the directory exists
    const fs = require('fs');
    try {
      const dirPath = directoryConfig.customDirectoryPath || directoryConfig.filesDir;
      const stats = fs.statSync(dirPath);
      if (stats.isDirectory()) {
        // List a few files as a test
        // console.log(`Directory working successfully`);
      } else {
        console.error(`Path exists but is not a directory: ${dirPath}`);
      }
    } catch (error) {
      console.error(`Error accessing directory: ${error.message}`);
    }
  });
};

startServer();

module.exports = app;
