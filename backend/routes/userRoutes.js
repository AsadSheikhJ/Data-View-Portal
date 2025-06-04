const express = require('express');
const router = express.Router();
// const path = require('path'); // Not strictly needed if userFileService handles paths
// const fs = require('fs').promises; // Not strictly needed if userFileService handles fs operations
const bcrypt = require('bcryptjs'); // Kept for password operations if createUser/updateUser handle it
const auth = require('../middleware/auth');
// const UserModel = require('../models/User'); // REMOVED Mongoose Model
const userFileService = require('../services/userFileService'); // ADDED File Service

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
router.get('/', auth, adminOnly, async (req, res) => {
  console.log('[UserRoutes GET /] req.user received from authMiddleware:', JSON.stringify(req.user));
  try {
    const users = await userFileService.getUsers();
    
    // Remove passwords from response
    const safeUsers = users.map(user => {
      const { password, ...userWithoutPassword } = user; // Assuming users from file service might still have hashed passwords
      return userWithoutPassword;
    });
    
    res.setHeader('Content-Type', 'application/json');
    return res.json(safeUsers);
  } catch (error) {
    console.error('[UserRoutes GET /] Error getting users:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
    return; // Added to ensure no further execution
  }
});

// Create user (admin only)
router.post('/', auth, adminOnly, async (req, res) => {
  try {
    const { name, email, password, role, permissions } = req.body;
    
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }
    
    // Check if user already exists - userFileService should ideally have a method for this
    // Assuming getUserByEmail exists or can be added to userFileService
    const existingUser = await userFileService.getUserByEmail(email);
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }
    
    // Create new user - userFileService.createUser should handle password hashing
    const newUser = await userFileService.createUser({
      name,
      email,
      password, // Pass plain password; service should hash it
      role: role || 'viewer', // Default role
      permissions: permissions || []
    });
    
    // userFileService.createUser should return the user without the password, or we filter it here
    const { password: _, ...safeNewUser } = newUser;

    res.status(201).json(safeNewUser);
  } catch (error) {
    console.error('Error creating user:', error);
    if (error.message.includes('already exists')) { // More specific error check from service
        return res.status(409).json({ message: error.message });
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get user by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
        return res.status(400).json({ message: 'Invalid user ID format.'});
    }
    
    if (req.user.role !== 'admin' && req.user.id !== userId) {
      return res.status(403).json({ message: 'Access denied' });
    }
    
    const user = await userFileService.getUserById(userId); // UPDATED
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
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
    if (isNaN(userId)) {
        return res.status(400).json({ message: 'Invalid user ID format.'});
    }

    // Data to update, password should be handled carefully (e.g., if provided, hash it)
    const updateData = req.body;
    if (updateData.password) {
        // If password is being updated, it should be hashed by the service
        // Or ensure userFileService.updateUser handles hashing if a new password is provided
    }

    const updatedUser = await userFileService.updateUser(userId, updateData); // UPDATED
    if (!updatedUser) { // Check if service returns null/undefined for not found
        return res.status(404).json({ message: 'User not found for update' });
    }

    const { password, ...safeUpdatedUser } = updatedUser; // Ensure password is not sent back
    res.json(safeUpdatedUser);
  } catch (error) {
    console.error('Error updating user:', error);
    
    if (error.message.includes('not found')) { // Adapt to error messages from service
      res.status(404).json({ message: error.message });
    } else {
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }
});

// Delete user
router.delete('/:id', auth, adminOnly, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    if (isNaN(userId)) {
        return res.status(400).json({ message: 'Invalid user ID format.'});
    }
    
    if (userId === req.user.id) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }
    
    const success = await userFileService.deleteUser(userId); // UPDATED
    if (!success) { // Service should return true on success, false/error on fail/not found
        return res.status(404).json({ message: 'User not found or not deleted' });
    }
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    
    if (error.message.includes('not found')) { // Adapt to error messages from service
      res.status(404).json({ message: error.message });
    } else {
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }
});

module.exports = router;
