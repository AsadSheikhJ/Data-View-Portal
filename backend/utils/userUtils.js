const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const usersPath = path.join(__dirname, '../data/users.json');

const readUsers = () => {
  const data = fs.readFileSync(usersPath);
  return JSON.parse(data);
};

const writeUsers = (data) => {
  fs.writeFileSync(usersPath, JSON.stringify(data, null, 2));
};

const createUser = async (userData) => {
  const usersData = readUsers();
  const hashedPassword = await bcrypt.hash(userData.password, 10);
  
  const newUser = {
    id: Date.now().toString(),
    ...userData,
    password: hashedPassword,
    createdAt: new Date().toISOString()
  };

  usersData.users.push(newUser);
  writeUsers(usersData);
  return newUser;
};

module.exports = {
  readUsers,
  writeUsers,
  createUser
};
