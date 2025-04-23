// Admin-only middleware
module.exports = function(req, res, next) {
  console.log('Admin check - User:', req.user);
  
  if (!req.user) {
    return res.status(401).json({ message: 'Authentication required' });
  }
  
  if (req.user.role !== 'admin') {
    console.log(`Access denied - User ${req.user.email} is not an admin`);
    return res.status(403).json({ message: 'Admin access required' });
  }
  
  console.log(`Admin access granted for ${req.user.email}`);
  next();
};
