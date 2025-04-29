const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const fileRoutes = require('./routes/fileRoutes');

// Initialize express app
const app = express();
// Define PORT but don't hardcode server start
// The actual port selection will be managed by bin/www
const PORT = process.env.PORT || 5000;

// JWT Secret Key
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

// File paths
const dataDir = path.join(__dirname, 'data');
const usersFilePath = path.join(dataDir, 'users.json');

// Middleware
// Use our dynamic CORS configuration
const corsOptions = require('./config/cors');
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logger for debugging
app.use((req, res, next) => {
  console.log( `${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms - ${res.get('Content-Length') || 0}`);
  
 
  next();
});

// Helper functions for file-based storage
async function ensureDataDir() {
  try {
    await fs.access(dataDir);
  } catch (error) {
    // Data directory doesn't exist, create it
    await fs.mkdir(dataDir, { recursive: true });
  }
}

async function getUsers() {
  await ensureDataDir();
  try {
    const data = await fs.readFile(usersFilePath, 'utf8');
    return JSON.parse(data);
  } catch (error)
  {
    console.error('Error reading users file:', error.message);
    throw error;
  }
}

async function saveUsers(users) {
  await ensureDataDir();
  await fs.writeFile(usersFilePath, JSON.stringify(users, null, 2));
}

async function getUserById(userId) {
  const users = await getUsers();
  return users.find(user => user.id === userId);
}

async function getUserByEmail(email) {
  const users = await getUsers();
  return users.find(user => user.email === email);
}

// Authentication middleware
const auth = async (req, res, next) => {
  // Get token from header
  const token = req.header('Authorization')?.replace('Bearer ', '');

  // Check if no token
  if (!token) {
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Get user from file storage
    const user = await getUserById(decoded.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Add user from payload to request
    req.user = decoded;
    next();
  } catch (err) {
    console.error('Auth middleware error:', err.message);
    res.status(401).json({ message: 'Token is not valid' });
  }
};

// Admin only middleware
const adminOnly = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  next();
};

// API Routes

// Default route
app.get('/', (req, res) => {
  res.json({ message: 'API is running' });
});

// Login route
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Find user
    const user = await getUserByEmail(email);
    
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Create token
    const payload = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role
    };
    
    jwt.sign(
      payload,
      JWT_SECRET,
      { expiresIn: '1h' },
      (err, token) => {
        if (err) throw err;
        
        // Return user and token
        res.json({
          token,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            permissions: user.permissions
          }
        });
      }
    );
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get current user route
app.get('/api/auth/me', auth, async (req, res) => {
  try {
    // Find user by ID from the decoded token
    const user = await getUserById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Return user without password
    const { password, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Verify token route
app.post('/api/auth/verify', async (req, res) => {
  const { token } = req.body;
  
  if (!token) {
    return res.status(400).json({ message: 'No token provided' });
  }
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    // Check if user still exists
    const user = await getUserById(decoded.id);
    
    if (!user) {
      return res.json({ valid: false });
    }
    
    res.json({ valid: true, user: decoded });
  } catch (err) {
    res.json({ valid: false });
  }
});

// Get all users route (admin only)
app.get('/api/users', auth, adminOnly, async (req, res) => {
  try {
    // Get all users
    const users = await getUsers();
    
    // Return users without passwords
    const usersWithoutPasswords = users.map(({ password, ...rest }) => rest);
    res.json(usersWithoutPasswords);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get user by ID route
app.get('/api/users/:id', auth, async (req, res) => {
  try {
    // Check if admin or requesting own record
    const userId = parseInt(req.params.id);
    
    if (req.user.role !== 'admin' && req.user.id !== userId) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const user = await getUserById(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Return user without password
    const { password, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Create user route (admin only)
app.post('/api/users', auth, adminOnly, async (req, res) => {
  try {
    const { name, email, password, role, permissions } = req.body;
    
    // Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }
    
    // Get all users
    let users = await getUsers();
    
    // Check if user already exists
    if (users.some(user => user.email === email)) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Create new user
    const newUser = {
      id: users.length > 0 ? Math.max(...users.map(u => u.id)) + 1 : 1,
      name,
      email,
      password: hashedPassword,
      role: role || 'user',
      permissions: permissions || { view: true, edit: false, download: false }
    };
    
    // Add user to array
    users.push(newUser);
    
    // Save users array to file
    await saveUsers(users);
    
    // Return user without password
    const { password: _, ...userWithoutPassword } = newUser;
    res.status(201).json(userWithoutPassword);
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Update user route (admin only)
app.put('/api/users/:id', auth, adminOnly, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { name, email, password, role, permissions } = req.body;
    
    // Get all users
    let users = await getUsers();
    
    // Find user index
    const userIndex = users.findIndex(u => u.id === userId);
    
    if (userIndex === -1) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Create updated user object
    const updatedUser = {
      ...users[userIndex],
      name: name || users[userIndex].name,
      email: email || users[userIndex].email,
      role: role || users[userIndex].role,
      permissions: permissions || users[userIndex].permissions
    };
    
    // Update password if provided
    if (password) {
      updatedUser.password = await bcrypt.hash(password, 10);
    }
    
    // Update user in array
    users[userIndex] = updatedUser;
    
    // Save users array to file
    await saveUsers(users);
    
    // Return user without password
    const { password: _, ...userWithoutPassword } = updatedUser;
    res.json(userWithoutPassword);
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete user route (admin only)
app.delete('/api/users/:id', auth, adminOnly, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    
    // Get all users
    let users = await getUsers();
    
    // Find user index
    const userIndex = users.findIndex(u => u.id === userId);
    
    if (userIndex === -1) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Check if trying to delete self
    if (userId === req.user.id) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }
    
    // Remove user from array
    users.splice(userIndex, 1);
    
    // Save users array to file
    await saveUsers(users);
    
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// File API routes - Apply authentication middleware
app.use('/api/files', auth, fileRoutes);

// API status route
app.get('/api/status', (req, res) => {
  res.json({ 
    status: 'ok', 
    message: 'API is running',
    storage: 'File-based (users.json)'
  });
});

// 404 Handler
app.use((req, res) => {
  console.log(`Route not found: ${req.method} ${req.url}`);
  res.status(404).json({ message: `Cannot ${req.method} ${req.url}` });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ message: 'Server error', error: err.message });
});

module.exports = { app, PORT };

