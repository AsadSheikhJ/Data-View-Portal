const http = require('http');
const fs = require('fs');
const path = require('path');

// Test API endpoints
async function testEndpoints() {
  console.log('Testing API endpoints...');
  
  // Get the server's base URL
  const baseUrl = 'http://localhost:5000'; // Adjust if needed
  
  // Test the config endpoint
  try {
    console.log(`\nTesting GET ${baseUrl}/api/files/config`);
    const configResponse = await fetchUrl(`${baseUrl}/api/files/config`);
    console.log('Response status:', configResponse.statusCode);
    console.log('Response headers:', configResponse.headers);
    console.log('Response body:', configResponse.body);
  } catch (error) {
    console.error('Error testing config endpoint:', error);
  }
  
  // Test the files listing endpoint
  try {
    console.log(`\nTesting GET ${baseUrl}/api/files`);
    const filesResponse = await fetchUrl(`${baseUrl}/api/files`);
    console.log('Response status:', filesResponse.statusCode);
    console.log('Files count:', JSON.parse(filesResponse.body).length);
  } catch (error) {
    console.error('Error testing files endpoint:', error);
  }
  
  // Read/create the config file directly as a test
  try {
    console.log('\nTesting config file access:');
    const configPath = path.join(__dirname, 'config', 'directoryConfig.json');
    const configDir = path.dirname(configPath);
    
    // Ensure directory exists
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
      console.log('Created config directory:', configDir);
    }
    
    // Check if config file exists
    if (fs.existsSync(configPath)) {
      const content = fs.readFileSync(configPath, 'utf8');
      console.log('Existing config file content:', content);
    } else {
      // Create a sample config for testing
      const sampleConfig = { directoryPath: path.join(__dirname, 'data', 'files') };
      fs.writeFileSync(configPath, JSON.stringify(sampleConfig, null, 2));
      console.log('Created sample config file:', sampleConfig);
    }
  } catch (configError) {
    console.error('Error accessing config file:', configError);
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
