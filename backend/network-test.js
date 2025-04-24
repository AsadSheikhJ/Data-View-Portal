/**
 * Network Accessibility Test Script
 * This script helps diagnose issues with network connectivity
 */

const http = require('http');
const os = require('os');

// Get network interfaces
const getNetworkInterfaces = () => {
  const interfaces = os.networkInterfaces();
  const results = [];

  Object.keys(interfaces).forEach(interfaceName => {
    interfaces[interfaceName].forEach(interface => {
      if (!interface.internal && interface.family === 'IPv4') {
        results.push({
          name: interfaceName,
          ip: interface.address,
          family: interface.family
        });
      }
    });
  });

  return results;
};

// Print network interface info
console.log('Network Interfaces:');
console.log(JSON.stringify(getNetworkInterfaces(), null, 2));

// Create a simple HTTP server that listens on all interfaces
const server = http.createServer((req, res) => {
  console.log(`Received request from: ${req.socket.remoteAddress}`);
  
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({
    message: 'Network test server is working!',
    yourIP: req.socket.remoteAddress,
    serverInterfaces: getNetworkInterfaces()
  }));
});

// The test port - intentionally different from your main app
const TEST_PORT = 5555;

server.listen(TEST_PORT, '0.0.0.0', () => {
  console.log(`\nTest server started on port ${TEST_PORT}`);
  console.log('\nYou can access this test server from other devices on your network using these URLs:');
  
  getNetworkInterfaces().forEach(iface => {
    console.log(`• http://${iface.ip}:${TEST_PORT} (via ${iface.name})`);
  });
  
  console.log('\nTry accessing these URLs from another device on your network.');
  console.log('If you can access the test server but not your main app, the issue might be with your app configuration.');
  console.log('If you cannot access the test server either, the issue is likely with your network configuration or firewall.');
  console.log('\nPress Ctrl+C to stop the test server.\n');
});