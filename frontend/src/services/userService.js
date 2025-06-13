// import API from '../utils/api';
import axios from 'axios';
import { getApiConfig } from './apiConfig';

const getAPIUrl = () => getApiConfig().baseUrl;

// Create axios instance with dynamic config
const api = axios.create({
  baseURL: getAPIUrl(),
  headers: {
    'Content-Type': 'application/json',
  }
});

// Export API methods with proper routes
export const getUsers = () => api.get('/api/users');
export const createUser = (userData) => api.post('/api/users', userData);
export const updateUserRole = (userId, role) => 
  api.put(`/api/users/${userId}/role`, { role });
