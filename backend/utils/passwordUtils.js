const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const usersPath = path.join(__dirname, '../data/users.json');

const resetAdminPassword = async (newPassword) => {
  try {
    const usersData = JSON.parse(fs.readFileSync(usersPath));
    const admin = usersData.users.find(u => u.role === 'admin');
    
    if (!admin) {
      throw new Error('Admin user not found');
    }

    admin.password = await bcrypt.hash(newPassword, 10);
    fs.writeFileSync(usersPath, JSON.stringify(usersData, null, 2));
    return true;
  } catch (error) {
    console.error('Password reset failed:', error);
    return false;
  }
};

module.exports = { resetAdminPassword };
