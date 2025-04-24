// App initialization diagnostic script

try {
  const app = require('./app');

  const http = require('http');
  const server = http.createServer(app);
  
  const testPort = 5001;
  server.listen(testPort, async () => {
    try {
      const response = await makeRequest('http://localhost:5001/');
    } catch (err) {
    } finally {
      server.close(() => {
        process.exit(0);
      });
    }
  });
  
} catch (err) {
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