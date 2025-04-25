import axios from 'axios';
import { getApiConfig } from '../services/apiConfig';

// Get API URL from different sources with priority
const getAPIUrl = () => {
  // First priority: Runtime configuration (set by the server at serve time)
  if (window.runtimeConfig && window.runtimeConfig.API_URL) {
    return window.runtimeConfig.API_URL;
  }
  
  // Second priority: API config from services
  return getApiConfig().baseUrl;
};

// Create an axios instance with dynamic configuration
const API = axios.create({
  baseURL: getAPIUrl(),
  headers: {
    'Content-Type': 'application/json'
  },
  withCredentials: true
});

// Log the configured API URL
console.log('API configured with base URL:', getAPIUrl());

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

// Listen for API config changes
window.addEventListener('apiConfigChanged', (event) => {
  if (event.detail && event.detail.baseUrl) {
    console.log('Updating API baseURL due to config change:', event.detail.baseUrl);
    API.defaults.baseURL = event.detail.baseUrl;
  }
});

export default API;