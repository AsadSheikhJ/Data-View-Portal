// App initialization diagnostic script
console.log('Starting app initialization diagnostic...');

try {
  console.log('1. Requiring Express app...');
  const app = require('./app');
  console.log('Express app loaded successfully');

  // Try to simulate some server initialization without actually starting the server
  console.log('\n2. Testing Express app methods...');
  console.log('App settings:', app.get('env'));
  console.log('Middleware count:', app._router?.stack?.length || 'Unknown');
  
  console.log('\nApp diagnostic complete - Express application loaded successfully.');
  
  // Test if server can respond to HTTP requests by creating a test server
  console.log('\n3. Testing server response with a sample request...');
  const http = require('http');
  const server = http.createServer(app);
  
  // Start server on a test port
  const testPort = 5001;
  server.listen(testPort, async () => {
    console.log(`Test server listening on port ${testPort}`);
    
    try {
      // Make a request to the server
      const response = await makeRequest('http://localhost:5001/');
      console.log('Server responded with status:', response.statusCode);
      console.log('Response body:', response.body);
      
      console.log('\nServer test successful! Your backend should work properly.');
    } catch (err) {
      console.error('Error during server test:', err);
    } finally {
      // Close the test server
      server.close(() => {
        console.log('Test server closed');
        process.exit(0);
      });
    }
  });
  
} catch (err) {
  console.error('App initialization failed with error:', err);
}

// Helper function to make HTTP requests
function makeRequest(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const body = data.length > 0 ? JSON.parse(data) : {};
          resolve({ statusCode: res.statusCode, body });
        } catch (err) {
          resolve({ statusCode: res.statusCode, body: data });
        }
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}