const checkPermission = (requiredRole) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(401).json({ message: 'Unauthorized - No user role found' });
    }
    
    const roles = {
      admin: 3,
      editor: 2,
      viewer: 1
    };
    
    // Default to viewer if role not recognized
    const userRoleLevel = roles[req.user.role] || 1;
    const requiredRoleLevel = roles[requiredRole] || 1;
    
    if (userRoleLevel >= requiredRoleLevel) {
      return next();
    }
    
    res.status(403).json({ message: 'Insufficient permissions' });
  };
};

// New function to check specific user permission
const checkSpecificPermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized - Authentication required' });
    }
    
    // Admin always has all permissions
    if (req.user.role === 'admin') {
      return next();
    }
    
    // Check if user has the specific permission
    if (req.user.permissions && req.user.permissions[permission] === true) {
      return next();
    }
    
    res.status(403).json({ message: `You do not have permission to ${permission} files` });
  };
};

module.exports = { checkPermission, checkSpecificPermission };
