const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs').promises;
const bcrypt = require('bcryptjs');
const auth = require('../middleware/auth');
const UserModel = require('../models/User');

// Admin-only middleware
function adminOnly(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Admin access required' });
  }
  
  next();
}

// Get all users (admin only)
router.get('/', async (req, res) => {
  try {
    console.log('Getting all users');
    
    // Get users from file storage
    const users = await UserModel.getUsers();
    
    // Remove passwords from response
    const safeUsers = users.map(user => {
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    });
    
    console.log(`Found ${safeUsers.length} users`);
    
    // Return JSON response
    res.setHeader('Content-Type', 'application/json');
    return res.json(safeUsers);
  } catch (error) {
    console.error('Error getting users:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
    return;
  }
});

// Create user (admin only)
router.post('/', auth, adminOnly, async (req, res) => {
  try {
    const { name, email, password, role, permissions } = req.body;
    
    // Validate required fields
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }
    
    // Check if user already exists
    const existingUser = await UserModel.getUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }
    
    // Create new user
    const newUser = await UserModel.createUser({
      name,
      email,
      password,
      role,
      permissions
    });
    
    res.status(201).json(newUser);
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get user by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    
    // Check permissions - only admin or self
    if (req.user.role !== 'admin' && req.user.id !== userId) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const user = await UserModel.getUserById(userId);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Return user without password
    const { password, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } catch (error) {
    console.error('Error getting user:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update user
router.put('/:id', auth, adminOnly, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    
    // Update user
    const updatedUser = await UserModel.updateUser(userId, req.body);
    res.json(updatedUser);
  } catch (error) {
    console.error('Error updating user:', error);
    
    if (error.message === 'User not found') {
      res.status(404).json({ message: 'User not found' });
    } else {
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }
});

// Delete user
router.delete('/:id', auth, adminOnly, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    
    // Prevent deleting self
    if (userId === req.user.id) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }
    
    // Delete user
    const result = await UserModel.deleteUser(userId);
    res.json(result);
  } catch (error) {
    console.error('Error deleting user:', error);
    
    if (error.message === 'User not found') {
      res.status(404).json({ message: 'User not found' });
    } else {
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }
});

module.exports = router;
