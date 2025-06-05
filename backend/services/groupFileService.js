const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto'); // For generating UUIDs
const directoryConfigService = require('./directoryConfigService'); // Added import

const groupsFilePath = path.join(__dirname, '..', 'data', 'groups.json');

// Helper function to read the groups file
async function readGroupsFile() {
  try {
    const data = await fs.readFile(groupsFilePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    // If file doesn't exist or other error, return empty array (or handle specific errors)
    if (error.code === 'ENOENT') {
      return []; // File not found, so no groups exist yet
    }
    console.error('Error reading groups file:', error);
    throw new Error('Could not read groups data.'); // Or return [] to be more resilient
  }
}

// Helper function to write to the groups file
async function writeGroupsFile(groupsArray) {
  try {
    await fs.writeFile(groupsFilePath, JSON.stringify(groupsArray, null, 2), 'utf8');
  } catch (error) {
    console.error('Error writing groups file:', error);
    throw new Error('Could not save groups data.');
  }
}

// --- Public Service Functions ---

async function getAllGroups() {
  return await readGroupsFile();
}

async function createGroup(groupData, creatingUserId) {
  // directoryPath is no longer part of groupData for createGroup
  const { name, description, users, restrictedSubDirectories } = groupData;
  
  if (!name) { // Only name is strictly required for the group object itself initially
    throw new Error('Group name is required.');
  }

  const groups = await readGroupsFile();

  if (groups.some(g => g.name.toLowerCase() === name.toLowerCase())) {
    throw new Error('A group with this name already exists.');
  }

  const newGroup = {
    id: crypto.randomUUID(),
    name,
    description: description || '',
    // directoryPath is REMOVED from here
    users: users || [{ userId: creatingUserId, role: 'admin' }], // Default to creator as admin if users array not provided
    restrictedSubDirectories: restrictedSubDirectories || [], // Default to empty array
    // allowedSubDirectories is renamed to restrictedSubDirectories based on user request, assumed this change here.
    // If it was meant to be allowedSubDirectories still, this can be reverted.
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  groups.push(newGroup);
  await writeGroupsFile(groups);
  return newGroup;
}

// Placeholder for other functions we will add later
async function getGroupById(groupId) {
  const groups = await readGroupsFile();
  const group = groups.find(g => g.id === groupId);
  if (!group) {
    // In a real app, you might throw an error or return null/undefined
    // For now, let's ensure routes handle this not found case
  }
  return group; 
}

async function updateGroup(groupId, updateData) {
  const groups = await readGroupsFile();
  const groupIndex = groups.findIndex(g => g.id === groupId);

  if (groupIndex === -1) {
    return null; // Or throw new Error('Group not found');
  }

  // Ensure only allowed fields are updated and directoryPath is not one of them
  const { name, description, users, restrictedSubDirectories, ...otherData } = updateData;
  if (Object.keys(otherData).some(key => key === 'directoryPath')) {
      throw new Error('directoryPath cannot be updated directly on the group object. Use the dedicated settings endpoint.');
  }
  if (Object.keys(otherData).length > 0 && !('allowedSubDirectories' in otherData && 'restrictedSubDirectories' in updateData) ){
      // Check if otherData contains anything other than a potential old allowedSubDirectories field being replaced
      // This is a bit complex, might need refinement based on exact update requirements
      const unknownKeys = Object.keys(otherData).filter(k => k !== 'allowedSubDirectories');
      if (unknownKeys.length > 0) {
         console.warn(`Attempting to update group with unhandled fields: ${unknownKeys.join(', ')}`);
      }
  }

  const updatedGroup = { 
    ...groups[groupIndex],
    name: name !== undefined ? name : groups[groupIndex].name,
    description: description !== undefined ? description : groups[groupIndex].description,
    users: users !== undefined ? users : groups[groupIndex].users,
    restrictedSubDirectories: restrictedSubDirectories !== undefined ? restrictedSubDirectories : (groups[groupIndex].restrictedSubDirectories || groups[groupIndex].allowedSubDirectories || []),
    // ^ handles rename from allowedSubDirectories to restrictedSubDirectories and defaults
    updatedAt: new Date().toISOString(),
  };
  
  // Clean up old allowedSubDirectories if new restrictedSubDirectories is set
  if (restrictedSubDirectories !== undefined && groups[groupIndex].allowedSubDirectories) {
    delete updatedGroup.allowedSubDirectories;
  }


  groups[groupIndex] = updatedGroup;
  await writeGroupsFile(groups);
  return groups[groupIndex];
}

async function deleteGroup(groupId) {
  let groups = await readGroupsFile();
  const initialLength = groups.length;
  groups = groups.filter(g => g.id !== groupId);

  if (groups.length < initialLength) {
    await writeGroupsFile(groups);
    // Also delete its directory path configuration
    try {
      await directoryConfigService.deleteGroupDirectoryPath(groupId);
      console.log(`Directory path configuration for group ${groupId} deleted.`);
    } catch (error) {
      console.error(`Error deleting directory path config for group ${groupId}:`, error.message);
      // Decide if this should be a critical failure or just a warning
    }
    return true; // Successfully deleted group from groups.json
  }
  return false; // Group not found or not deleted
}

async function addUserToGroup(groupId, userId, role) {
  const groups = await readGroupsFile();
  const groupIndex = groups.findIndex(g => g.id === groupId);
  if (groupIndex === -1) {
    throw new Error('Group not found.');
  }
  const userInGroup = groups[groupIndex].users.find(u => u.userId === userId);
  if (userInGroup) {
    userInGroup.role = role;
  } else {
    groups[groupIndex].users.push({ userId, role });
  }
  groups[groupIndex].updatedAt = new Date().toISOString();
  await writeGroupsFile(groups);
  return groups[groupIndex];
}

async function removeUserFromGroup(groupId, userId) {
  const groups = await readGroupsFile();
  const groupIndex = groups.findIndex(g => g.id === groupId);
  if (groupIndex === -1) {
    throw new Error('Group not found.');
  }
  groups[groupIndex].users = groups[groupIndex].users.filter(u => u.userId !== userId);
  groups[groupIndex].updatedAt = new Date().toISOString();
  await writeGroupsFile(groups);
  return groups[groupIndex];
}

// Renamed from updateGroupSubdirectories to reflect field name change
async function updateGroupRestrictedSubdirectories(groupId, subdirectories) {
  const groups = await readGroupsFile();
  const groupIndex = groups.findIndex(g => g.id === groupId);
  if (groupIndex === -1) {
    throw new Error('Group not found.');
  }
  groups[groupIndex].restrictedSubDirectories = subdirectories || [];
  // Clean up old allowedSubDirectories if it exists
  if (groups[groupIndex].allowedSubDirectories) {
    delete groups[groupIndex].allowedSubDirectories;
  }
  groups[groupIndex].updatedAt = new Date().toISOString();
  await writeGroupsFile(groups);
  return groups[groupIndex];
}

async function removeUserFromAllGroups(userIdToRemove) {
  console.log(`[Debug] Attempting to remove user ID: ${userIdToRemove} (type: ${typeof userIdToRemove}) from all groups.`);
  const groups = await readGroupsFile();
  let modified = false;
  
  const updatedGroups = groups.map(group => {
    console.log(`[Debug] Processing group: ${group.name} (ID: ${group.id})`);
    const initialUserCount = group.users.length;
    
    const updatedUsers = group.users.filter(userInGroup => {
      console.log(`[Debug] Comparing group user ID: ${userInGroup.userId} (type: ${typeof userInGroup.userId}) with userIdToRemove: ${userIdToRemove}`);
      return userInGroup.userId !== userIdToRemove;
    });
    
    if (updatedUsers.length < initialUserCount) {
      console.log(`[Debug] User ${userIdToRemove} found in group ${group.name}. Marking for update.`);
      modified = true;
      return { ...group, users: updatedUsers, updatedAt: new Date().toISOString() };
    }
    console.log(`[Debug] User ${userIdToRemove} NOT found in group ${group.name} or no change needed.`);
    return group;
  });

  console.log(`[Debug] Finished mapping groups. 'modified' flag is: ${modified}`);

  if (modified) {
    console.log(`[Debug] 'modified' is true. Attempting to write updated groups file.`);
    try {
      await writeGroupsFile(updatedGroups);
      console.log(`User ${userIdToRemove} removed from all relevant groups and file written.`);
    } catch (error) {
      console.error(`[Critical Error] Failed to write groups file after attempting to remove user ${userIdToRemove}:`, error.message);
      // Re-throw the error so the caller (userFileService.deleteUser) can potentially catch it
      // or at least be aware the operation was not fully successful.
      throw error; 
    }
  } else {
    console.log(`[Debug] 'modified' is false. No changes made to groups file for user ${userIdToRemove}.`);
  }
  return modified;
}

module.exports = {
  getAllGroups,
  createGroup,
  getGroupById,
  updateGroup,
  deleteGroup,
  addUserToGroup,
  removeUserFromGroup,
  updateGroupRestrictedSubdirectories, // Renamed export
  removeUserFromAllGroups, // Add new function to exports
}; 