import React, { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext();
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const verifyToken = async () => {
      const storedToken = localStorage.getItem('token');
      
      if (!storedToken) {
        setLoading(false);
        return;
      }
      
      try {
        // Try to extract user info from token to use if API fails
        try {
          const tokenParts = storedToken.split('.');
          if (tokenParts.length === 3) {
            const base64Url = tokenParts[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(
              atob(base64)
                .split('')
                .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
                .join('')
            );
            const tokenData = JSON.parse(jsonPayload);
            
            // Set basic user info from token
            setUser({
              id: tokenData.id,
              name: tokenData.name,
              email: tokenData.email,
              role: tokenData.role,
              // Default permissions if not in token
              permissions: tokenData.permissions || {
                view: true,
                edit: tokenData.role === 'admin',
                download: tokenData.role === 'admin'
              }
            });
          }
        } catch (e) {
          console.warn('Could not parse token payload:', e);
        }
        
        // Try to verify with API
        try {
          // Fetch user data directly first - more reliable
          const userResponse = await fetch(`${API_URL}/api/auth/me`, {
            headers: {
              'Authorization': `Bearer ${storedToken}`
            }
          });
          
          if (userResponse.ok) {
            const userData = await userResponse.json();
            setUser(userData);
            console.log('User data fetched successfully:', userData);
          } else {
            // Only if /me fails, try verify
            const verifyResponse = await fetch(`${API_URL}/api/auth/verify`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ token: storedToken })
            });
            
            if (!verifyResponse.ok || !(await verifyResponse.json()).valid) {
              // Invalid token
              throw new Error('Token verification failed');
            }
          }
        } catch (apiError) {
          console.warn('API verification failed, using token data:', apiError);
          // We already set user from token above, so continue with that
        }
        
        setToken(storedToken);
      } catch (err) {
        console.error('Auth verification error:', err);
        
        // Only clear token if it's truly invalid
        if (err.message === 'Token verification failed') {
          localStorage.removeItem('token');
          setToken(null);
          setUser(null);
        }
      } finally {
        setLoading(false);
      }
    };
    
    verifyToken();
  }, []);

  const login = async (email, password) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Login failed' }));
        throw new Error(errorData.message || 'Login failed');
      }
      
      const data = await response.json();
      
      if (!data.token) {
        throw new Error('No token received');
      }
      
      localStorage.setItem('token', data.token);
      setToken(data.token);
      setUser(data.user);
      
      return true;
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      loading,
      error,
      login,
      logout,
      isAuthenticated: !!user
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

export default AuthContext;