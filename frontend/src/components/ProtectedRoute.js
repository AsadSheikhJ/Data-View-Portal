const ProtectedRoute = ({ children, requiredRole = 'viewer' }) => {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const roles = {
    admin: 3,
    editor: 2,
    viewer: 1
  };

  if (roles[user.role] < roles[requiredRole]) {
    return <Navigate to="/" replace />;
  }

  return children;
};
