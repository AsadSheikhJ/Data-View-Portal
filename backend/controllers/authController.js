// filepath: c:\Users\asad.jamal\Desktop\Project Data & Files\PRISMA Project\Pyhton Scripts\Data View Portal\backend\controllers\authController.js
const jwt = require('jsonwebtoken');
const { User } = require('../models/User');
const config = require('../config/config');

// Register a new user
exports.register = async (req, res) => {
  const { name, email, password, role } = req.body;

  // Basic validation
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Please provide name, email and password' });
  }

  try {
    // If role is admin or editor, check if current user is admin (unless it's the first user)
    if ((role === 'admin' || role === 'editor') && req.user && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only administrators can create admin or editor accounts' });
    }

    // Create the user
    const user = await User.create({ name, email, password, role: role || 'viewer' });
    
    res.status(201).json({
      message: 'User registered successfully',
      user
    });
  } catch (error) {
    console.error('Registration error:', error);
    if (error.message === 'User already exists') {
      return res.status(400).json({ error: 'User with this email already exists' });
    }
    res.status(500).json({ error: 'Server error during registration' });
  }
};

// Login user
exports.login = async (req, res) => {
  const { email, password } = req.body;

  // Basic validation
  if (!email || !password) {
    return res.status(400).json({ error: 'Please provide email and password' });
  }

  try {
    // Find the user
    const user = await User.findByEmail(email);
    
    // Check if user exists
    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }
    
    // Check if user is active
    if (!user.active) {
      return res.status(403).json({ error: 'Account is inactive. Please contact administrator.' });
    }
    
    // Check password
    const isMatch = await User.comparePassword(password, user.password);
    
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }
    
    // Record login time
    await User.recordLogin(user.id);
    
    // Generate JWT token
    const payload = {
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      }
    };
    
    jwt.sign(
      payload,
      config.jwtSecret, // Make sure this is set in your config file
      { expiresIn: '12h' },
      (err, token) => {
        if (err) throw err;
        res.json({
          message: 'Login successful',
          token,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            message: 'Welcome back!'
          }
        });
      }
    );
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error during login' });
  }
};

// Get authenticated user
exports.getUser = async (req, res) => {
  try {
    // req.user is set by auth middleware
    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Return user without password
    const { password, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Server error fetching user data' });
  }
};

// Get all users (admin only)
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.getAllUsers();
    console.log('Fetched all users:', users);
    res.json(users);
  } catch (error) {
    console.error('Error fetching all users:', error);
    res.status(500).json({ error: 'Server error fetching users' });
  } 
};

// Update a user
exports.updateUser = async (req, res) => {
  try {
    const userId = req.params.id;
    const updates = req.body;
    
    // Check if user exists
    const existingUser = await User.findById(userId);
    if (!existingUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Check if user is authorized to update this account
    // Only allow users to update their own account, unless they're an admin
    if (userId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to update this user' });
    }
    
    // Don't allow regular users to change their role
    if (updates.role && userId === req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Cannot change your own role' });
    }
    
    const updatedUser = await User.update(userId, updates);
    
    res.json({
      message: 'User updated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Server error updating user' });
  }
};

// Delete a user
exports.deleteUser = async (req, res) => {
  try {
    const userId = req.params.id;
    
    // Don't allow users to delete themselves
    if (userId === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }
    
    // Delete the user
    await User.delete(userId);
    
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Error deleting user:', error);
    if (error.message === 'User not found') {
      return res.status(404).json({ error: 'User not found' });
    }
    res.status(500).json({ error: 'Server error deleting user' });
  }
};

// Toggle user activation status
exports.toggleUserActivation = async (req, res) => {
  try {
    const userId = req.params.id;
    
    // Don't allow users to deactivate themselves
    if (userId === req.user.id) {
      return res.status(400).json({ error: 'Cannot change your own activation status' });
    }
    
    const updatedUser = await User.toggleActivation(userId);
    
    res.json({
      message: `User ${updatedUser.active ? 'activated' : 'deactivated'} successfully`,
      user: updatedUser
    });
  } catch (error) {
    console.error('Error toggling user activation:', error);
    if (error.message === 'User not found') {
      return res.status(404).json({ error: 'User not found' });
    }
    res.status(500).json({ error: 'Server error toggling user activation' });
  }
};