/**
 * File-based User Model
 * 
 * This is a simple representation of the user object stored in the JSON file.
 * It doesn't use mongoose as we're using a file-based storage approach.
 */

const bcrypt = require('bcryptjs');
const fs = require('fs').promises;
const path = require('path');

// File paths
const dataDir = path.join(__dirname, '..', 'data');
const usersFilePath = path.join(dataDir, 'users.json');

// User data structure
const userStructure = {
  id: Number,
  name: String,
  email: String,
  password: String,
  role: String, // 'admin', 'user'
  permissions: {
    view: Boolean,
    edit: Boolean,
    download: Boolean
  }
};

// Helper functions
async function ensureDataDir() {
  try {
    await fs.access(dataDir);
  } catch (error) {
    await fs.mkdir(dataDir, { recursive: true });
  }
}

async function getUsers() {
  await ensureDataDir();
  try {
    const data = await fs.readFile(usersFilePath, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    if (error.code === 'ENOENT' || error instanceof SyntaxError) {
      // Create default users if file doesn't exist
      const defaultUsers = [
        {
          id: 1,
          name: 'Admin User',
          email: 'admin@example.com',
          password: await bcrypt.hash('admin123', 10),
          role: 'admin',
          permissions: { view: true, edit: true, download: true }
        },
        {
          id: 2,
          name: 'Regular User',
          email: 'user@example.com',
          password: await bcrypt.hash('user123', 10),
          role: 'user',
          permissions: { view: true, edit: false, download: false }
        }
      ];
      
      await saveUsers(defaultUsers);
      return defaultUsers;
    }
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

async function createUser(userData) {
  const users = await getUsers();
  
  // Create new ID (max + 1)
  const newId = users.length > 0 ? Math.max(...users.map(u => u.id)) + 1 : 1;
  
  // Hash password
  const hashedPassword = await bcrypt.hash(userData.password, 10);
  
  // Create user object
  const newUser = {
    id: newId,
    name: userData.name,
    email: userData.email,
    password: hashedPassword,
    role: userData.role || 'user',
    permissions: userData.permissions || { view: true, edit: false, download: false }
  };
  
  // Save to file
  users.push(newUser);
  await saveUsers(users);
  
  // Return user without password
  const { password, ...userWithoutPassword } = newUser;
  return userWithoutPassword;
}

async function updateUser(userId, userData) {
  const users = await getUsers();
  const userIndex = users.findIndex(u => u.id === userId);
  
  if (userIndex === -1) {
    throw new Error('User not found');
  }
  
  // Update user fields
  const updatedUser = {
    ...users[userIndex],
    name: userData.name || users[userIndex].name,
    email: userData.email || users[userIndex].email,
    role: userData.role || users[userIndex].role,
    permissions: userData.permissions || users[userIndex].permissions
  };
  
  // Update password if provided
  if (userData.password) {
    updatedUser.password = await bcrypt.hash(userData.password, 10);
  }
  
  // Save to file
  users[userIndex] = updatedUser;
  await saveUsers(users);
  
  // Return user without password
  const { password, ...userWithoutPassword } = updatedUser;
  return userWithoutPassword;
}

async function deleteUser(userId) {
  const users = await getUsers();
  const userIndex = users.findIndex(u => u.id === userId);
  
  if (userIndex === -1) {
    throw new Error('User not found');
  }
  
  // Remove user from array
  users.splice(userIndex, 1);
  await saveUsers(users);
  
  return { message: 'User deleted successfully' };
}

module.exports = {
  getUsers,
  getUserById,
  getUserByEmail,
  createUser,
  updateUser,
  deleteUser,
  saveUsers,
  ensureDataDir
};
