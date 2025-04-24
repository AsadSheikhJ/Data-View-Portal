/**
 * Application Diagnostic Tool
 * Helps identify issues with network connectivity and server configuration
 */

const express = require('express');
const http = require('http');
const os = require('os');
const { execSync } = require('child_process');

// Create an express app for testing
const app = express();
const TEST_PORT = 5555;

// Get network interfaces
function getNetworkInterfaces() {
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
}

// Get Windows Firewall status
function getFirewallStatus() {
  try {
    const stdout = execSync('netsh advfirewall show allprofiles', { encoding: 'utf8' });
    return stdout;
  } catch (error) {
    return `Error checking firewall status: ${error.message}`;
  }
}

// Test route
app.get('/', (req, res) => {
  res.json({
    status: 'success',
    message: 'Diagnostic server is running',
    clientIP: req.ip,
    headers: req.headers
  });
});

// Network info route
app.get('/network', (req, res) => {
  res.json({
    interfaces: getNetworkInterfaces(),
    hostname: os.hostname(),
    platform: os.platform(),
    release: os.release()
  });
});

// Firewall info route
app.get('/firewall', (req, res) => {
  res.json({
    status: getFirewallStatus()
  });
});

// Start server
const server = app.listen(TEST_PORT, '0.0.0.0', () => {
  console.log(`
==================================================
      NETWORK ACCESSIBILITY DIAGNOSTIC TOOL
==================================================

This tool will help diagnose why your application
might not be accessible over your local network.
`);

  const interfaces = getNetworkInterfaces();
  
  if (interfaces.length === 0) {
    console.log('⚠️ No external network interfaces found! This might be why your app isn\'t accessible.');
    console.log('   Make sure Wi-Fi or Ethernet is enabled on this computer.');
  } else {
    console.log('Network Interfaces:');
    interfaces.forEach(iface => {
      console.log(`• ${iface.name}: ${iface.ip}`);
    });
    
    console.log('\nTest URLs (try these from another device on your network):');
    interfaces.forEach(iface => {
      console.log(`• http://${iface.ip}:${TEST_PORT}`);
    });
  }
  
  console.log(`
Firewall Troubleshooting
------------------------
If you can't access the test URLs above, your firewall might be blocking the connection.
Try one of the following:

1. Open Windows Defender Firewall:
   • Go to Control Panel > System and Security > Windows Defender Firewall
   • Click "Allow an app or feature through Windows Defender Firewall"
   • Click "Change settings" > "Allow another app..."
   • Browse to your Node.js executable (usually in "C:\\Program Files\\nodejs\\node.exe")
   • Make sure both "Private" and "Public" networks are checked
   • Click "OK" to save changes

2. Or create a firewall rule via command prompt (Run as Administrator):
   netsh advfirewall firewall add rule name="Node.js Port ${TEST_PORT}" dir=in action=allow protocol=TCP localport=${TEST_PORT}
   
After making firewall changes, you may need to restart the diagnostic server.

Press Ctrl+C to stop the diagnostic server.
==================================================
`);
});

// Export for module usage
module.exports = server;