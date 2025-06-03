const express = require('express');
const router = express.Router();
const Group = require('../models/Group');
const { checkPermission } = require('../middleware/permissions');
const fs = require('fs').promises;
const path = require('path');

// Create a new group (admin only)
router.post('/', checkPermission('admin'), async (req, res) => {
  try {
    const { name, description, directoryPath } = req.body;

    // Validate directory exists
    try {
      await fs.access(directoryPath);
      const stats = await fs.stat(directoryPath);
      if (!stats.isDirectory()) {
        return res.status(400).json({ message: 'Path is not a directory' });
      }
    } catch (error) {
      return res.status(400).json({ message: 'Directory does not exist' });
    }

    const group = new Group({
      name,
      description,
      directoryPath,
      users: [{ user: req.user._id, role: 'admin' }] // Add creator as admin
    });

    await group.save();
    res.status(201).json(group);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get all groups (admin only)
router.get('/', checkPermission('admin'), async (req, res) => {
  try {
    const groups = await Group.find().populate('users.user', 'username email');
    res.json(groups);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Get user's groups
router.get('/my-groups', async (req, res) => {
  try {
    const groups = await Group.find({
      'users.user': req.user._id
    }).populate('users.user', 'username email');
    res.json(groups);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update group (admin only)
router.put('/:id', checkPermission('admin'), async (req, res) => {
  try {
    const { name, description, directoryPath } = req.body;
    
    if (directoryPath) {
      // Validate new directory if provided
      try {
        await fs.access(directoryPath);
        const stats = await fs.stat(directoryPath);
        if (!stats.isDirectory()) {
          return res.status(400).json({ message: 'Path is not a directory' });
        }
      } catch (error) {
        return res.status(400).json({ message: 'Directory does not exist' });
      }
    }

    const group = await Group.findByIdAndUpdate(
      req.params.id,
      { name, description, directoryPath },
      { new: true }
    );

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    res.json(group);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Add user to group (admin only)
router.post('/:id/users', checkPermission('admin'), async (req, res) => {
  try {
    const { userId, role } = req.body;
    const group = await Group.findById(req.params.id);

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Check if user already exists in group
    const existingUser = group.users.find(u => u.user.toString() === userId);
    if (existingUser) {
      existingUser.role = role;
    } else {
      group.users.push({ user: userId, role });
    }

    await group.save();
    res.json(group);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Update allowed subdirectories (admin only)
router.put('/:id/subdirectories', checkPermission('admin'), async (req, res) => {
  try {
    const { subdirectories } = req.body;
    const group = await Group.findById(req.params.id);

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Validate all subdirectories exist within the group's directory
    for (const subdir of subdirectories) {
      const fullPath = path.join(group.directoryPath, subdir.path);
      try {
        const stats = await fs.stat(fullPath);
        if (!stats.isDirectory()) {
          return res.status(400).json({ 
            message: `Path is not a directory: ${subdir.path}` 
          });
        }
      } catch (error) {
        return res.status(400).json({ 
          message: `Directory does not exist: ${subdir.path}` 
        });
      }
    }

    group.allowedSubDirectories = subdirectories;
    await group.save();
    res.json(group);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Remove user from group (admin only)
router.delete('/:id/users/:userId', checkPermission('admin'), async (req, res) => {
  try {
    const group = await Group.findById(req.params.id);

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    group.users = group.users.filter(u => u.user.toString() !== req.params.userId);
    await group.save();
    res.json(group);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// Delete group (admin only)
router.delete('/:id', checkPermission('admin'), async (req, res) => {
  try {
    const group = await Group.findByIdAndDelete(req.params.id);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }
    res.json({ message: 'Group deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router; 