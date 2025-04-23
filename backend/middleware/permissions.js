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

module.exports = { checkPermission };
