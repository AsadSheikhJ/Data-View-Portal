const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const auth = require('../middleware/auth');
const User = require('../models/User');

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

// Login route
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    console.log('Login attempt for:', email);
    
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }
    
    // Find user by email
    const user = await User.getUserByEmail(email);
    
    if (!user) {
      console.log(`User not found: ${email}`);
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    
    if (!isMatch) {
      console.log(`Password mismatch for: ${email}`);
      return res.status(401).json({ message: 'Invalid credentials' });
    }
    
    // Create token payload
    const payload = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      permissions: user.permissions
    };
    
    // Sign token
    jwt.sign(
      payload,
      JWT_SECRET,
      { expiresIn: '1h' },  // Changed from '12h' to '1h'
      (err, token) => {
        if (err) throw err;
        
        // Return success with token and user info
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
        
        console.log(`Login successful for: ${email}`);
      }
    );
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get current user
router.get('/me', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.getUserById(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Remove password
    const { password, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Verify token
router.post('/verify', async (req, res) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({ message: 'No token provided' });
    }
    
    try {
      // Verify token
      const decoded = jwt.verify(token, JWT_SECRET);
      
      // Check if user exists
      const user = await User.getUserById(decoded.id);
      
      if (!user) {
        return res.json({ valid: false });
      }
      
      res.json({
        valid: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      });
    } catch (err) {
      console.error('Token verification failed:', err.message);
      res.json({ valid: false });
    }
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
