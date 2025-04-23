const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '../data');
const usersPath = path.join(dataDir, 'users.json');

const initializeFileSystem = () => {
  try {
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir);
    }

    if (!fs.existsSync(usersPath)) {
      const initialData = {
        users: [{
          id: "1",
          username: "admin",
          email: "admin@example.com",
          password: "$2b$10$SzCagezXdyecw8AWyf4GNeA4IR.rEkzsY/l0pt3vDnfVn28SRXkuq",
          role: "admin",
          createdAt: new Date().toISOString()
        }]
      };
      fs.writeFileSync(usersPath, JSON.stringify(initialData, null, 2));
    } else {
      // Validate existing JSON
      try {
        JSON.parse(fs.readFileSync(usersPath));
      } catch (err) {
        console.error('Invalid users.json, regenerating...');
        fs.writeFileSync(usersPath, JSON.stringify({
          users: [{
            id: "1",
            username: "admin",
            email: "admin@example.com",
            password: "$2b$10$SzCagezXdyecw8AWyf4GNeA4IR.rEkzsY/l0pt3vDnfVn28SRXkuq",
            role: "admin",
            createdAt: new Date().toISOString()
          }]
        }, null, 2));
      }
    }

    console.log('File system storage initialized');
  } catch (error) {
    console.error('Error initializing file system storage:', error);
    process.exit(1);
  }
};

module.exports = initializeFileSystem;
