#!/usr/bin/env node

/**
 * Server startup script
 */

console.log('Starting server...');

// Set environment to development if not set
process.env.NODE_ENV = process.env.NODE_ENV || 'development';

// Start the server
require('./server');

console.log(`Environment: ${process.env.NODE_ENV}`);
console.log('To stop the server, press Ctrl+C');
