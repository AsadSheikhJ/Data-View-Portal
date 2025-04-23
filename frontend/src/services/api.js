import axios from 'axios';

// API base URL - adjust as needed
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// Create an axios instance
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to include auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// User management API endpoints
export const userApi = {
  getAllUsers: () => api.get('/api/users'),
  getUserById: (id) => api.get(`/api/users/${id}`),
  createUser: (userData) => api.post('/api/users', userData),
  updateUser: (id, userData) => api.put(`/api/users/${id}`, userData),
  deleteUser: (id) => api.delete(`/api/users/${id}`),
};

// File management API endpoints
export const fileApi = {
  getAllFiles: () => api.get('/api/files'),
  getFileById: (id) => api.get(`/api/files/${id}`),
  uploadFile: (fileData) => {
    const formData = new FormData();
    formData.append('file', fileData.file);
    formData.append('metadata', JSON.stringify(fileData.metadata || {}));
    return api.post('/api/files/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },
  deleteFile: (id) => api.delete(`/api/files/${id}`),
  downloadFile: (id) => api.get(`/api/files/${id}/download`, { responseType: 'blob' }),
};

export default api;
