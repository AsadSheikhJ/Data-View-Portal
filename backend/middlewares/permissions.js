const checkPermission = (requiredRole) => {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
    if (req.user.role === 'admin') return next();
    
    const roles = {
      admin: 3,
      editor: 2,
      viewer: 1
    };
    
    if (roles[req.user.role] >= roles[requiredRole]) {
      return next();
    }
    
    res.status(403).json({ message: 'Insufficient permissions' });
  };
};

module.exports = { checkPermission };
