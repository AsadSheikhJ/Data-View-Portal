const bcrypt = require('bcryptjs');

const verifyHash = async (password, hash) => {
  return await bcrypt.compare(password, hash);
};

const testHashes = async () => {
  const testHash = await bcrypt.hash('adminPassword123', 10);
  console.log('New hash for "adminPassword123":', testHash);
  
  const isMatch = await verifyHash('admin123', '$2a$10$N9qo8uLOickgx2ZMRZoMy.Mrq4H3zQ6Z6XZf1Qh7W6F5Jw5QYbW1O');
  console.log('Verification result:', isMatch);
};

testHashes();
