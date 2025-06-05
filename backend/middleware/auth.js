const jwt = require('jsonwebtoken');
const userFileService = require('../services/userFileService'); // Added
// const path = require('path'); // Not used directly here
// const fs = require('fs').promises; // Not used directly here

// Secret key for JWT
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

// Authentication middleware
module.exports = async function(req, res, next) { // Made async
  console.log(`[AuthMiddleware] Path: ${req.method} ${req.path}`);
  
  try {
    // Get token from header
    const authHeader = req.header('Authorization');
    if (!authHeader) {
      console.log('[AuthMiddleware] No Authorization header found.');
      return res.status(401).json({ message: 'No token, authorization denied' });
    }
    console.log(`[AuthMiddleware] Authorization header present: ${authHeader.substring(0, 15)}...`); // Log start of header
    
    // Extract token from Authorization header
    const token = authHeader.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : authHeader;
    
    if (!token) {
      console.log('[AuthMiddleware] Token not extracted from header or header malformed.');
      return res.status(401).json({ message: 'Token not provided or malformed header' });
    }
    // For security, don't log the full token in production, but for debugging a snippet is fine.
    console.log(`[AuthMiddleware] Extracted token: ${token.substring(0, 10)}...`);
    
    // Verify token
    // Changed jwt.verify to use promises for async/await compatibility
    const decoded = await new Promise((resolve, reject) => {
      jwt.verify(token, JWT_SECRET, (err, decodedPayload) => {
        if (err) {
          console.error('[AuthMiddleware] Token verification failed:', err.message);
          // It's important to reject here so the catch block below handles it
          return reject(err);
        }
        resolve(decodedPayload);
      });
    });

    // Fetch fresh user data
    const user = await userFileService.getUserById(decoded.id);
    if (!user) {
      console.log(`[AuthMiddleware] User with id ${decoded.id} not found after token verification.`);
      return res.status(401).json({ message: 'User not found or token invalid' }); // Or 404
    }

    // Exclude password from the user object attached to req
    const { password, ...userToAttach } = user;
    req.user = userToAttach;
    console.log('[AuthMiddleware] Token verified successfully. Fresh User:', JSON.stringify(req.user));
    next();

  } catch (err) {
    // This catch block handles errors from jwt.verify (if it rejects) or other synchronous errors
    console.error('[AuthMiddleware] Exception during token processing or verification:', err.message);
    // Ensure a response is sent if not already handled
    if (!res.headersSent) {
      // Differentiate between verification failure and other errors if possible
      if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
        return res.status(401).json({ message: 'Token is invalid or expired' });
      }
      res.status(401).json({ message: 'Authentication error (exception)' });
    }
  }
};
