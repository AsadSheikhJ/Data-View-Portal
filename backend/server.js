const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');  // Use synchronous fs for checking build folder
const http = require('http');
const net = require('net');
const fileRoutes = require('./routes/fileRoutes');
const userRoutes = require('./routes/userRoutes');
const authRoutes = require('./routes/authRoutes');
const sharedConfig = require('../shared-config');

// Import authentication middleware
const authMiddleware = require('./middleware/auth');

const app = express();
let PORT = sharedConfig.PORT;

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
    
    server.listen(port, '0.0.0.0');
  });
};

// Function to find an available port starting from the specified one
const findAvailablePort = async (startPort) => {
  console.log(`Checking for available port starting from ${startPort}...`);
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
  
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(
      `${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms - ${res.get('Content-Length') || 0}`
    );
  });
  
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
app.get('/api/files/config', authMiddleware, (req, res) => {
  try {
    
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

app.post('/api/files/config', authMiddleware, (req, res) => {
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
app.use('/api/files', authMiddleware, fileRoutes);

// API status route
app.get('/api/status', (req, res) => {
  res.json({
    status: 'ok',
    message: 'API is running',
    timestamp: new Date().toISOString()
  });
});

// Check for React frontend build
const frontendBuildPath = path.join(__dirname, '../frontend/build');
let frontendAvailable = false;

try {
  if (fs.existsSync(frontendBuildPath) && fs.existsSync(path.join(frontendBuildPath, 'index.html'))) {
    console.log('Frontend build found at:', frontendBuildPath);
    frontendAvailable = true;
    
    // Serve static files from React build
    app.use(express.static(frontendBuildPath));
    
    // Handle React routing - all non-API routes should return the React app
    app.get('*', (req, res, next) => {
      // Skip API routes and let them be handled by the API handlers
      if (req.path.startsWith('/api/')) {
        return next();
      }
      // Serve the React index.html for all other routes to support client-side routing
      res.sendFile(path.join(frontendBuildPath, 'index.html'));
    });
  } else {
    console.log('Frontend build not found. Only API endpoints will be available.');
  }
} catch (error) {
  console.error('Error checking for frontend build:', error);
}

// 404 handler - Handle API routes that don't match any endpoint
app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    console.log(`API route not found: ${req.method} ${req.url}`);
    res.status(404).json({ message: `Cannot ${req.method} ${req.url}` });
  } else if (!frontendAvailable) {
    // Only reach here if frontend is not available and a non-API route is requested
    res.status(404).send('Not found. Frontend is not built.');
  }
  // If frontend is available, the React app's routing will handle 404s
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ message: 'Server error' });
});

// Start server
const startServer = async () => {
  PORT = await findAvailablePort(PORT);
  console.log(`Using available port: ${PORT}`);
  const server = app.listen(PORT, '0.0.0.0', () => {
    const directoryConfig = require('./config/directoryConfig');
    const networkInfo = require('./utils/networkInfo');
    
    console.log(`\n=== Data View Portal (Combined Frontend & Backend) ===`);
    console.log(`Server running on port ${PORT}`);
    
    if (frontendAvailable) {
      console.log(`Frontend is being served on the same port`);
    } else {
      console.log(`Frontend is NOT available - only API endpoints can be accessed`);
      console.log(`To serve the frontend, build it first: cd ../frontend && npm run build`);
    }
    
    // Display network access information
    networkInfo.printAccessUrls(PORT);
    
    // Check if the directory exists
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
