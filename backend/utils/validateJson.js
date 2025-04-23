const fs = require('fs');

const validateJsonFile = (filePath) => {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    JSON.parse(content);
    return true;
  } catch (err) {
    console.error(`Invalid JSON in ${filePath}:`, err);
    return false;
  }
};

module.exports = { validateJsonFile };
