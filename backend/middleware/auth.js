const jwt = require('jsonwebtoken');
// const path = require('path'); // Not used directly here
// const fs = require('fs').promises; // Not used directly here

// Secret key for JWT
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

// Authentication middleware
module.exports = function(req, res, next) {
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
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err) {
        console.error('[AuthMiddleware] Token verification failed:', err.message);
        return res.status(401).json({ message: 'Token is invalid' });
      }
      
      // Add user from payload to request
      req.user = decoded;
      console.log('[AuthMiddleware] Token verified successfully. User:', JSON.stringify(req.user));
      next();
    });
  } catch (err) {
    // This catch block might not be hit often if jwt.verify handles its own errors and responds.
    // However, it's good for unexpected issues within the try block itself before jwt.verify.
    console.error('[AuthMiddleware] Exception during token processing:', err);
    // Ensure a response is sent if not already handled by jwt.verify callback.
    if (!res.headersSent) {
        res.status(401).json({ message: 'Authentication error (exception)' });
    }
  }
};
