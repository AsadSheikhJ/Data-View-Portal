const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const usersPath = path.join(__dirname, '../data/users.json');

const resetAdminPassword = async () => {
  try {
    const usersData = JSON.parse(fs.readFileSync(usersPath));
    const admin = usersData.users.find(u => u.role === 'admin');
    
    if (!admin) {
      throw new Error('Admin user not found');
    }

    // Generate new hash with current salt rounds
    admin.password = await bcrypt.hash('adminPassword123', 10);
    fs.writeFileSync(usersPath, JSON.stringify(usersData, null, 2));
    
    console.log('Admin password reset successfully');
    console.log('New hash:', admin.password);
    return true;
  } catch (error) {
    console.error('Password reset failed:', error);
    return false;
  }
};

module.exports = { resetAdminPassword };
