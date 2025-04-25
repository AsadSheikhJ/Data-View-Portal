import API from '../utils/api';

// Export API methods with proper routes
export const getUsers = () => API.get('/api/users');
export const createUser = (userData) => API.post('/api/users', userData);
export const updateUserRole = (userId, role) => 
  API.put(`/api/users/${userId}/role`, { role });
