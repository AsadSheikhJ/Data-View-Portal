import React, { createContext, useState, useContext, useEffect } from 'react';

import { getApiConfig } from '../services/apiConfig';

// Get the API URL from our centralized configuration
const getAPIUrl = () => {
  // First check for runtime configuration (from window.runtimeConfig)
  // if (window.runtimeConfig && window.runtimeConfig.API_URL) {
  //   return window.runtimeConfig.API_URL;
  // }
  
  // Then fall back to our centralized API config
  return getApiConfig().baseUrl;
};

const AuthContext = createContext();
const API_URL = getAPIUrl();

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
        // Try to extract user info from token
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
            
            // Check token expiration
            if (tokenData.exp && tokenData.exp < Date.now() / 1000) {
              throw new Error('Token expired');
            }
          }
        } catch (e) {
          console.warn('Token parsing error:', e);
          throw new Error('Invalid token');
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
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
        if (!window.location.pathname.includes('login')) {
          window.location.href = '/login?session=expired';
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
      // Use more modern fetch with proper error handling to avoid redirects
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password }),
        signal: controller.signal
      }).catch(networkError => {
        console.error('Network error during login:', networkError);
        
        // Handle different network errors appropriately
        if (networkError.name === 'AbortError') {
          throw new Error('Login request timed out. The server might be down or overloaded.');
        }
        
        throw new Error('Unable to connect to the server. Please check your internet connection and try again.');
      });
      
      // Clear the timeout since the request completed
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        // Try to get detailed error from response
        const errorData = await response.json().catch(() => ({ 
          message: response.status === 401 
            ? 'Invalid email or password' 
            : `Server error (${response.status})` 
        }));
        
        throw new Error(errorData.message || 'Login failed');
      }
      
      const data = await response.json().catch(error => {
        console.error('Error parsing JSON from login response:', error);
        throw new Error('Invalid response from server');
      });
      
      if (!data.token) {
        throw new Error('Authentication failed: No token received');
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