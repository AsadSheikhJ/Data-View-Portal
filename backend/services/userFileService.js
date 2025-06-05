const fs = require('fs').promises;
const path = require('path');
const bcrypt = require('bcryptjs');
const groupFileService = require('./groupFileService');

const usersFilePath = path.join(__dirname, '..', 'data', 'users.json');

// Helper function to read the users file
async function readUsersFile() {
  try {
    const data = await fs.readFile(usersFilePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      await writeUsersFile([]); // Create the file with an empty array if it doesn't exist
      return [];
    }
    console.error('Error reading users.json:', error);
    throw new Error('Could not read users data.');
  }
}

// Helper function to write to the users file (will be used for full CRUD later)
async function writeUsersFile(usersArray) {
  try {
    await fs.writeFile(usersFilePath, JSON.stringify(usersArray, null, 2), 'utf8');
  } catch (error) {
    console.error('Error writing users.json:', error);
    throw new Error('Could not save users data.');
  }
}

async function _getNextId(users) {
  if (!users || users.length === 0) {
    return 1;
  }
  const maxId = users.reduce((max, user) => (user.id > max ? user.id : max), 0);
  return maxId + 1;
}

// --- Public Service Functions ---

async function getUsers() {
  return await readUsersFile();
}

async function getUserById(userId) {
  const users = await readUsersFile();
  // userId from users.json is numeric
  const numericUserId = parseInt(userId, 10);
  return users.find(user => user.id === numericUserId);
}

async function getUserByEmail(email) {
  const users = await readUsersFile();
  return users.find(user => user.email === email);
}

async function createUser(userData) {
  const { name, email, password, role, permissions } = userData;
  if (!name || !email || !password) {
    throw new Error('Name, email, and password are required for user creation.');
  }

  const users = await readUsersFile();
  const existingUser = users.find(u => u.email === email);
  if (existingUser) {
    throw new Error('User with this email already exists.');
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const newId = await _getNextId(users);

  const newUser = {
    id: newId,
    name,
    email,
    password: hashedPassword,
    role: role || 'viewer',
    permissions: permissions || [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  users.push(newUser);
  await writeUsersFile(users);

  const { password: _, ...safeNewUser } = newUser; // Exclude password from returned object
  return safeNewUser;
}

async function updateUser(userId, updateData) {
  const numericUserId = parseInt(userId, 10);
  if (isNaN(numericUserId)) {
    throw new Error('Invalid user ID format for update.');
  }

  const users = await readUsersFile();
  const userIndex = users.findIndex(u => u.id === numericUserId);

  if (userIndex === -1) {
    throw new Error('User not found for update.');
  }

  const originalUser = users[userIndex];
  // Start with the original user data, then selectively apply updates.
  let updatedUser = { ...originalUser };

  // Apply all non-password updates from updateData
  for (const key in updateData) {
    if (key !== 'password') {
      updatedUser[key] = updateData[key];
    }
  }

  // Handle password update specifically
  // If a new password is provided and it's a non-empty string, hash it.
  if (updateData.password && typeof updateData.password === 'string' && updateData.password.trim() !== '') {
    updatedUser.password = await bcrypt.hash(updateData.password, 10);
  } else {
    // Otherwise, ensure the original password (already in updatedUser due to {...originalUser}) is retained.
    // This explicit 'else' block clarifies the intent, though technically covered if updateData.password is undefined.
    // If updateData.password was null or an empty string, this ensures originalUser.password is used.
    updatedUser.password = originalUser.password;
  }
  
  updatedUser.updatedAt = new Date().toISOString();
  users[userIndex] = updatedUser;
  await writeUsersFile(users);

  const { password, ...safeUpdatedUser } = updatedUser; // Exclude password
  return safeUpdatedUser;
}

async function deleteUser(userId) {
  const numericUserId = parseInt(userId, 10);
  if (isNaN(numericUserId)) {
    throw new Error('Invalid user ID format for deletion.');
  }

  const users = await readUsersFile();
  const initialLength = users.length;
  const filteredUsers = users.filter(u => u.id !== numericUserId);

  if (filteredUsers.length < initialLength) {
    await writeUsersFile(filteredUsers);
    
    // After deleting user, remove them from all groups
    try {
      await groupFileService.removeUserFromAllGroups(numericUserId);
      console.log(`User ${numericUserId} successfully removed from all groups.`);
    } catch (error) {
      console.error(`Error removing user ${numericUserId} from groups:`, error.message);
      // Decide if this error should be propagated or just logged
      // For now, logging and continuing as user deletion was successful
    }
    return true; // User was deleted
  }
  return false; // User not found or not deleted
}

module.exports = {
  getUsers,
  getUserById,
  getUserByEmail,
  createUser,
  updateUser,
  deleteUser,
  // writeUsersFile // Generally not exposed unless necessary for other services
}; 