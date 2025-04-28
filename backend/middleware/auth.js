const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs').promises;

// Secret key for JWT
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

// Authentication middleware
module.exports = function(req, res, next) {
  // console.log('Auth middleware running for:', req.method, req.path);
  
  try {
    // Get token from header
    const authHeader = req.header('Authorization');
    // console.log('Auth header:', authHeader ? 'Present' : 'Missing');
    
    // Skip auth check for browser testing if needed
    // if (!authHeader && process.env.NODE_ENV === 'development') {
    //   console.log('Development mode: Bypassing auth for testing');
    //   req.user = { id: 1, email: 'admin@example.com', role: 'admin' };
    //   return next();
    // }
    
    if (!authHeader) {
      console.log('No Authorization header');
      return res.status(401).json({ message: 'No token, authorization denied' });
    }
    
    // Extract token from Authorization header
    const token = authHeader.startsWith('Bearer ') 
      ? authHeader.substring(7) 
      : authHeader;
    
    if (!token) {
      console.log('Token not provided');
      return res.status(401).json({ message: 'Token not provided' });
    }
    
    // Verify token
    jwt.verify(token, JWT_SECRET, (err, decoded) => {
      if (err) {
        console.error('Token verification error:', err.message);
        return res.status(401).json({ message: 'Token is invalid' });
      }
      
      // Add user from payload to request
      req.user = decoded;
      // console.log('Token verified for user:', decoded.email);
      next();
    });
  } catch (err) {
    console.error('Auth middleware exception:', err);
    res.status(401).json({ message: 'Authentication error' });
  }
};
