/**
 * Shared configuration between frontend and backend
 * This allows both to use the same port settings
 */

// Default port for the application
const PORT = process.env.PORT || 5000;

// Export configuration for use in other files
module.exports = {
  PORT
};