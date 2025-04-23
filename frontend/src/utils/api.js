import axios from 'axios';

const API = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000',
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: true
});

// Add request interceptor
API.interceptors.request.use(config => {
  // Add a requestId to help identify duplicate requests
  config.headers['X-Request-ID'] = Date.now().toString();
  
  // Ensure all requests include /api prefix for backend routing
  if (!config.url.startsWith('/api/')) {
    config.url = `/api${config.url.startsWith('/') ? '' : '/'}${config.url}`;
  }
  
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, error => {
  return Promise.reject(error);
});

// Add response interceptor with better error handling
API.interceptors.response.use(
  response => response,
  error => {
    console.error('API error:', error.config?.url, error.response?.status);
    if (error.response?.status === 401) {
      // Only redirect if not on login page already
      if (!window.location.pathname.includes('login')) {
        window.location = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default API;