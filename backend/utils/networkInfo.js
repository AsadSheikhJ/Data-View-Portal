/**
 * Network information utility
 * Provides functions to get information about network interfaces and accessibility
 */

const os = require('os');

/**
 * Get all IPv4 network interfaces that can be used for network access
 * @returns {Array} Array of objects containing interface name, ip, and family
 */
function getNetworkInterfaces() {
  const interfaces = os.networkInterfaces();
  const results = [];

  Object.keys(interfaces).forEach(interfaceName => {
    interfaces[interfaceName].forEach(interface => {
      // Skip internal interfaces and non-IPv4 interfaces
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

/**
 * Print access URLs for the server
 * @param {number} port - The port the server is running on
 */
function printAccessUrls(port) {
  console.log('\n=== Network Access Information ===');
  console.log(`Local: http://localhost:${port}`);
  
  const interfaces = getNetworkInterfaces();
  
  if (interfaces.length > 0) {
    console.log('\nYou can access this application from other devices on your network using these addresses:');
    interfaces.forEach(iface => {
      console.log(`• http://${iface.ip}:${port} (via ${iface.name})`);
    });
    console.log('\nMake sure your firewall allows connections to this port.');
  } else {
    console.log('No external network interfaces found. Only localhost access will be available.');
  }
  
  console.log('===================================\n');
}

module.exports = {
  getNetworkInterfaces,
  printAccessUrls
};