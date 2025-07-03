const express = require('express');
const router = express.Router();
// const Group = require('../models/Group'); // REMOVED Mongoose Model
const groupFileService = require('../services/groupFileService'); // ADDED File Service
const userFileService = require('../services/userFileService'); // For populating user details if needed
const directoryConfigService = require('../services/directoryConfigService'); // Added
const { checkPermission } = require('../middleware/permissions');
const fs = require('fs').promises;
const path = require('path');

// Helper to populate user details for groups (simplified)
async function populateGroupUsers(groups) {
  if (!Array.isArray(groups)) groups = [groups]; // Handle single group object
  if (groups.length === 0) return groups;

  const allUsers = await userFileService.getUsers(); // Assumes getUsers() returns all users from users.json
  return groups.map(group => {
    if (group && group.users) {
      const populatedUsers = group.users.map(groupUser => {
        const foundUser = allUsers.find(u => u.id === groupUser.userId);
        return {
          user: foundUser ? { id: foundUser.id, username: foundUser.name, email: foundUser.email } : { id: groupUser.userId, username: 'Unknown User' },
          role: groupUser.role
        };
      });
      return { ...group, users: populatedUsers };
    }
    return group;
  });
}

// Create a new group (admin only)
router.post('/', checkPermission('admin'), async (req, res) => {
  try {
    // directoryPath is no longer provided here. Users and restrictedSubDirectories are optional.
    const { name, description, users, restrictedSubDirectories } = req.body;
    if (!name) {
      return res.status(400).json({ message: 'Group name is required' });
    }
    // Directory path validation is removed from here.
    // It will be handled when setting the path via the /config/path endpoint.

    const groupData = { name, description, users, restrictedSubDirectories }; // Pass all relevant fields
    const group = await groupFileService.createGroup(groupData, req.user.id);
    res.status(201).json(group);
  } catch (error) {
    if (error.message.includes('already exists')) {
        return res.status(409).json({ message: error.message });
    }
    console.error('Error creating group:', error);
    res.status(500).json({ message: error.message || 'Failed to create group' });
  }
});

// Get all groups (admin only)
router.get('/', checkPermission('admin'), async (req, res) => {
  try {
    const groups = await groupFileService.getAllGroups();
    const populatedGroups = await populateGroupUsers(groups);
    res.json(populatedGroups);
  } catch (error) {
    console.error('Error getting all groups:', error);
    res.status(500).json({ message: error.message || 'Failed to retrieve groups' });
  }
});

// Get user's groups
router.get('/my-groups', async (req, res) => {
  try {
    if (!req.user || typeof req.user.id === 'undefined') { // req.user.id should be numeric
      return res.status(401).json({ message: 'User information is missing or invalid.' });
    }
    const allGroups = await groupFileService.getAllGroups();
    const userId = parseInt(req.user.id, 10);
    const userGroups = allGroups.filter(group => 
      group.users && group.users.some(u => u.userId === userId)
    );
    const populatedUserGroups = await populateGroupUsers(userGroups);
    res.json(populatedUserGroups);
  } catch (error) {
    console.error('Error fetching user groups:', error);
    res.status(500).json({ message: error.message || 'Failed to retrieve your groups' });
  }
});

// Get a specific group by ID (admin only)
router.get('/:id', checkPermission('admin'), async (req, res) => {
  try {
    const group = await groupFileService.getGroupById(req.params.id);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }
    const [populatedGroup] = await populateGroupUsers([group]); // Populate for single group
    res.json(populatedGroup);
  } catch (error) {
    console.error(`Error getting group ${req.params.id}:`, error);
    res.status(500).json({ message: error.message || 'Failed to retrieve group' });
  }
});

// Update group (admin only)
router.put('/:id', checkPermission('admin'), async (req, res) => {
  try {
    // directoryPath is no longer updatable here.
    const { name, description, users, restrictedSubDirectories } = req.body;
    // Path validation removed.

    const updateData = { name, description, users, restrictedSubDirectories };
    // Filter out undefined fields so they don't overwrite existing data with undefined
    Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);

    const updatedGroup = await groupFileService.updateGroup(req.params.id, updateData);
    if (!updatedGroup) {
      return res.status(404).json({ message: 'Group not found for update' });
    }
    const [populatedGroup] = await populateGroupUsers([updatedGroup]);
    res.json(populatedGroup);
  } catch (error) {
    console.error(`Error updating group ${req.params.id}:`, error);
    if (error.message.includes('directoryPath cannot be updated')){
        return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: error.message || 'Failed to update group' });
  }
});

// Add/Update user in group (admin only)
router.post('/:id/users', checkPermission('admin'), async (req, res) => {
  try {
    const { userId, role } = req.body;
    if (typeof userId === 'undefined' || !role) {
        return res.status(400).json({ message: 'User ID and role are required.'});
    }
    const numericUserId = parseInt(userId, 10);
    if (isNaN(numericUserId)) {
        return res.status(400).json({ message: 'Invalid User ID format.'});
    }

    const group = await groupFileService.addUserToGroup(req.params.id, numericUserId, role);
    const [populatedGroup] = await populateGroupUsers([group]);
    res.json(populatedGroup);
  } catch (error) {
    console.error(`Error adding user to group ${req.params.id}:`, error);
    res.status(500).json({ message: error.message || 'Failed to add user to group' });
  }
});

// Update allowed subdirectories (admin only)
router.put('/:id/subdirectories', checkPermission('admin'), async (req, res) => {
  try {
    const { subdirectories } = req.body; // Expects an array of strings (paths)
    const group = await groupFileService.getGroupById(req.params.id);

    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Validate all subdirectories exist within the group's directory
    if (subdirectories && Array.isArray(subdirectories)) {
        for (const subdir of subdirectories) {
            if (typeof subdir !== 'string') return res.status(400).json({ message: `Invalid subdirectory entry: ${subdir}` });
            const fullPath = path.join(group.directoryPath, subdir);
            try {
            const stats = await fs.stat(fullPath);
            if (!stats.isDirectory()) {
                return res.status(400).json({ message: `Path is not a directory: ${subdir}` });
            }
            } catch (error) {
            return res.status(400).json({ message: `Directory does not exist: ${subdir}` });
            }
        }
    }

    const updatedGroup = await groupFileService.updateGroupSubdirectories(req.params.id, subdirectories);
    res.json(updatedGroup);
  } catch (error) {
    console.error(`Error updating subdirectories for group ${req.params.id}:`, error);
    res.status(500).json({ message: error.message || 'Failed to update subdirectories' });
  }
});

// Remove user from group (admin only)
router.delete('/:id/users/:userId', checkPermission('admin'), async (req, res) => {
  try {
    const numericUserId = parseInt(req.params.userId, 10);
    if (isNaN(numericUserId)) {
        return res.status(400).json({ message: 'Invalid User ID format.'});
    }
    const group = await groupFileService.removeUserFromGroup(req.params.id, numericUserId);
    const [populatedGroup] = await populateGroupUsers([group]);
    res.json(populatedGroup);
  } catch (error) {
    console.error(`Error removing user from group ${req.params.id}:`, error);
    res.status(500).json({ message: error.message || 'Failed to remove user from group' });
  }
});

// Delete group (admin only)
router.delete('/:id', checkPermission('admin'), async (req, res) => {
  try {
    const success = await groupFileService.deleteGroup(req.params.id);
    if (!success) {
      return res.status(404).json({ message: 'Group not found or not deleted' });
    }
    res.json({ message: 'Group deleted successfully' });
  } catch (error) {
    console.error(`Error deleting group ${req.params.id}:`, error);
    res.status(500).json({ message: error.message || 'Failed to delete group' });
  }
});

// --- Group Configuration: Restricted Subdirectories & Directory Path ---

// Update restricted subdirectories (admin only)
router.put('/:id/config/subdirectories', checkPermission('admin'), async (req, res) => {
  try {
    const { restrictedSubdirectories } = req.body; // Expects an array of strings (full relative paths)
    const groupId = req.params.id;

    const group = await groupFileService.getGroupById(groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found' });
    }

    // Validate subdirectories only if they are provided and the array is not empty
    if (restrictedSubdirectories && Array.isArray(restrictedSubdirectories) && restrictedSubdirectories.length > 0) {
      const groupBasePath = await directoryConfigService.getGroupDirectoryPath(groupId);
      if (!groupBasePath) {
        return res.status(400).json({ message: 'Group directory path is not set. Cannot validate subdirectories. Please set the main path in Settings first.' });
      }

      for (const relativeSubdirPath of restrictedSubdirectories) {
        if (typeof relativeSubdirPath !== 'string' || relativeSubdirPath.includes('..')) { // Basic validation for path components
          return res.status(400).json({ message: `Invalid subdirectory path format: '${relativeSubdirPath}'. Must not contain '..'.` });
        }
        // Normalize the path for checking (e.g. convert backslashes to forward slashes, remove trailing slashes)
        const normalizedRelativePath = path.normalize(relativeSubdirPath).replace(/\\/g, '/').replace(/\/$/,'');
        if (normalizedRelativePath === '') {
            return res.status(400).json({ message: `Invalid subdirectory path: cannot be empty or root.` });
        }

        const fullPathToCheck = path.join(groupBasePath, normalizedRelativePath);
        try {
          const stats = await fs.stat(fullPathToCheck);
          if (!stats.isDirectory()) {
            return res.status(400).json({ message: `Path is not a directory: '${normalizedRelativePath}' within group path.` });
          }
        } catch (error) {
          // If stat fails, directory does not exist or is not accessible
          return res.status(400).json({ message: `Directory does not exist or is inaccessible: '${normalizedRelativePath}' within group path.` });
        }
      }
    }

    const updatedGroup = await groupFileService.updateGroupRestrictedSubdirectories(groupId, restrictedSubdirectories || []);
    const [populatedGroup] = await populateGroupUsers([updatedGroup]);
    res.json(populatedGroup);
  } catch (error) {
    console.error(`Error updating restricted subdirectories for group ${req.params.id}:`, error);
    res.status(500).json({ message: error.message || 'Failed to update restricted subdirectories' });
  }
});

// Get all group directory path configurations (admin only)
router.get('/config/paths', checkPermission('admin'), async (req, res) => {
  try {
    const configs = await directoryConfigService.getAllGroupDirectoryConfigs();
    res.json(configs);
  } catch (error) {
    console.error('Error getting all group directory configs:', error);
    res.status(500).json({ message: error.message || 'Failed to retrieve group directory configurations.' });
  }
});

// Get a specific group's directory path (admin only)
router.get('/:groupId/config/path', checkPermission('admin'), async (req, res) => {
  try {
    const groupPath = await directoryConfigService.getGroupDirectoryPath(req.params.groupId);
    if (!groupPath) {
      return res.status(404).json({ message: 'Directory path not configured for this group.' });
    }
    res.json({ groupId: req.params.groupId, path: groupPath });
  } catch (error) {
    console.error(`Error getting directory path for group ${req.params.groupId}:`, error);
    res.status(500).json({ message: error.message || 'Failed to retrieve group directory path.' });
  }
});

// Set/Update a specific group's directory path (admin only)
router.put('/:groupId/config/path', checkPermission('admin'), async (req, res) => {
  try {
    const { path: newDirectoryPath } = req.body;
    if (!newDirectoryPath) {
      return res.status(400).json({ message: 'Directory path is required in the request body.' });
    }
    // Ensure group exists before setting path
    const group = await groupFileService.getGroupById(req.params.groupId);
    if (!group) {
      return res.status(404).json({ message: 'Group not found. Cannot set directory path.' });
    }

    const updatedConfig = await directoryConfigService.setGroupDirectoryPath(req.params.groupId, newDirectoryPath);
    res.json({ message: 'Group directory path updated successfully.', ...updatedConfig });
  } catch (error) {
    console.error(`Error setting directory path for group ${req.params.groupId}:`, error);
    // Catch specific errors from setGroupDirectoryPath if path is invalid
    if (error.message.includes('not a directory') || error.message.includes('does not exist')) {
      return res.status(400).json({ message: error.message });
    }
    res.status(500).json({ message: error.message || 'Failed to set group directory path.' });
  }
});

module.exports = router; 