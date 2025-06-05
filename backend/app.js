const express = require('express');
const cors = require('cors');
const path = require('path');
// const fs = require('fs').promises; // No longer directly used here
// const jwt = require('jsonwebtoken'); // No longer directly used here
// const bcrypt = require('bcryptjs'); // No longer directly used here

// Route Imports
const fileRoutes = require('./routes/fileRoutes');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const groupRoutes = require('./routes/groups'); // Assuming 'groups.js' is the file

// Middleware Imports
const authMiddleware = require('./middleware/auth');
// const { checkPermission } = require('./middleware/permissions'); // Not directly used in app.js if routes handle their own permissions

// Initialize express app
const app = express();
// Define PORT but don't hardcode server start
const PORT = process.env.PORT || 5000;

// JWT Secret Key - Though JWT operations are now in authRoutes/authMiddleware
// const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret'; // Can be removed if not used by other parts of app.js

// File paths - No longer needed here
// const dataDir = path.join(__dirname, 'data');
// const usersFilePath = path.join(dataDir, 'users.json');

// Middleware
const corsOptions = require('./config/cors');
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logger for debugging
app.use((req, res, next) => {
  // Simple logger, can be expanded
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms - ${res.get('Content-Length') || 0}`);
  });
  next();
});

// Helper functions for file-based storage - REMOVED
// async function ensureDataDir() { ... }
// async function getUsers() { ... }
// async function saveUsers(users) { ... }
// async function getUserById(userId) { ... }
// async function getUserByEmail(email) { ... }

// Authentication middleware - REMOVED (now in ./middleware/auth.js)
// const auth = async (req, res, next) => { ... };

// Admin only middleware - REMOVED (now using checkPermission from ./middleware/permissions.js within routes)
// const adminOnly = (req, res, next) => { ... };

// API Routes

// Default route
app.get('/', (req, res) => {
  res.json({ message: 'API is running' });
});

// Auth Routes (Login, Get current user, Verify token) - REMOVED (now in ./routes/authRoutes.js)
// app.post('/api/auth/login', async (req, res) => { ... });
// app.get('/api/auth/me', auth, async (req, res) => { ... });
// app.post('/api/auth/verify', async (req, res) => { ... });

// User CRUD Routes (Get all, Get by ID, Create, Update, Delete) - REMOVED (now in ./routes/userRoutes.js)
// app.get('/api/users', auth, adminOnly, async (req, res) => { ... });
// app.get('/api/users/:id', auth, async (req, res) => { ... });
// app.post('/api/users', auth, adminOnly, async (req, res) => { ... });
// app.put('/api/users/:id', auth, adminOnly, async (req, res) => { ... });
// app.delete('/api/users/:id', auth, adminOnly, async (req, res) => { ... });


// Mount Routers
app.use('/api/auth', authRoutes); // Auth routes typically don't need authMiddleware globally
app.use('/api/users', authMiddleware, userRoutes);
app.use('/api/groups', authMiddleware, groupRoutes);
app.use('/api/files', authMiddleware, fileRoutes); // Ensure this uses the main authMiddleware

// API status route
app.get('/api/status', (req, res) => {
  res.json({
    status: 'ok',
    message: 'API is running',
    storage: 'File-based (services)' // Updated message
  });
});

// 404 Handler
app.use((req, res) => {
  console.log(`Route not found: ${req.method} ${req.url}`);
  res.status(404).json({ message: `Cannot ${req.method} ${req.url}` });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err.stack || err); // Log stack for better debugging
  res.status(err.status || 500).json({
    message: err.message || 'Server error',
    error: process.env.NODE_ENV === 'development' ? err : {} // Only show error details in dev
  });
});

module.exports = { app, PORT };

