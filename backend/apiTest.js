const http = require('http');
const fs = require('fs');
const path = require('path');

// Test API endpoints
async function testEndpoints() {
  
  // Get the server's base URL
  const baseUrl = 'http://localhost:5000'; // Adjust if needed
  
  // Test the config endpoint
  try {
    const configResponse = await fetchUrl(`${baseUrl}/api/files/config`);
  } catch (error) {
  }
  
  // Test the files listing endpoint
  try {
    const filesResponse = await fetchUrl(`${baseUrl}/api/files`);
  } catch (error) {
  }
  
  // Read/create the config file directly as a test
  try {
    const configPath = path.join(__dirname, 'config', 'directoryConfig.json');
    const configDir = path.dirname(configPath);
    
    // Ensure directory exists
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    
    // Check if config file exists
    if (fs.existsSync(configPath)) {
      const content = fs.readFileSync(configPath, 'utf8');
    } else {
      // Create a sample config for testing
      const sampleConfig = { directoryPath: path.join(__dirname, 'data', 'files') };
      fs.writeFileSync(configPath, JSON.stringify(sampleConfig, null, 2));
    }
  } catch (configError) {
  }
}

// Helper function to make HTTP requests
function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

// Run the tests
testEndpoints().catch(console.error);
