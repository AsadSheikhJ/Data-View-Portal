import axios from 'axios';
import { getApiConfig } from './apiConfig'; // Assuming you have this for base URL

const getAPIUrl = () => getApiConfig().baseUrl;

// Create axios instance with dynamic config
const api = axios.create({
  baseURL: getAPIUrl(),
  headers: {
    'Content-Type': 'application/json',
  }
});

// Add request interceptor to include auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Ensure URLs start with /api (adjust if your setup is different)
    if (config.url && !config.url.startsWith('/api/')) {
      config.url = `/api${config.url.startsWith('/') ? '' : '/'}${config.url}`;
    } else if (config.url && config.url.startsWith('/api/api/')){
      // Corrects potential double /api/api prefix if baseUrl already contains /api
      config.url = config.url.substring(4);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Listen for API config changes (if you have this pattern from fileService.js)
// window.addEventListener('apiConfigChanged', () => {
//   api.defaults.baseURL = getAPIUrl();
// });

const groupService = {
  getAllGroups: async () => {
    try {
      const response = await api.get('/groups');
      return response.data;
    } catch (error) {
      console.error('Error fetching all groups:', error.response ? error.response.data : error.message);
      throw error.response ? error.response.data : error;
    }
  },

  getGroupById: async (groupId) => {
    try {
      const response = await api.get(`/groups/${groupId}`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching group ${groupId}:`, error.response ? error.response.data : error.message);
      throw error.response ? error.response.data : error;
    }
  },

  createGroup: async (groupData) => {
    // groupData should contain: name, and optionally description, users, restrictedSubdirectories
    try {
      const response = await api.post('/groups', groupData);
      return response.data;
    } catch (error) {
      console.error('Error creating group:', error.response ? error.response.data : error.message);
      throw error.response ? error.response.data : error;
    }
  },

  updateGroup: async (groupId, groupData) => {
    // groupData can contain: name, description, users, restrictedSubdirectories
    try {
      const response = await api.put(`/groups/${groupId}`, groupData);
      return response.data;
    } catch (error) {
      console.error(`Error updating group ${groupId}:`, error.response ? error.response.data : error.message);
      throw error.response ? error.response.data : error;
    }
  },

  deleteGroup: async (groupId) => {
    try {
      const response = await api.delete(`/groups/${groupId}`);
      return response.data;
    } catch (error) {
      console.error(`Error deleting group ${groupId}:`, error.response ? error.response.data : error.message);
      throw error.response ? error.response.data : error;
    }
  },

  addUserToGroup: async (groupId, userId, role) => {
    try {
      const response = await api.post(`/groups/${groupId}/users`, { userId, role });
      return response.data;
    } catch (error) {
      console.error(`Error adding user ${userId} to group ${groupId}:`, error.response ? error.response.data : error.message);
      throw error.response ? error.response.data : error;
    }
  },

  removeUserFromGroup: async (groupId, userId) => {
    try {
      const response = await api.delete(`/groups/${groupId}/users/${userId}`);
      return response.data;
    } catch (error) {
      console.error(`Error removing user ${userId} from group ${groupId}:`, error.response ? error.response.data : error.message);
      throw error.response ? error.response.data : error;
    }
  },
  
  // Placeholder for userService.getAllUsers if you want to centralize it here
  // or call it directly from userService in your components.
  // getAllSystemUsers: async () => { ... } 

  updateGroupRestrictedSubdirectories: async (groupId, restrictedSubdirectories) => {
    try {
      // The backend route was changed to /groups/:id/config/subdirectories
      const response = await api.put(`/groups/${groupId}/config/subdirectories`, { restrictedSubdirectories });
      return response.data;
    } catch (error) {
      console.error(`Error updating restricted subdirectories for group ${groupId}:`, error.response ? error.response.data : error.message);
      throw error.response ? error.response.data : error;
    }
  },

  // --- New functions for Group Directory Path Configuration ---
  getAllGroupDirectoryConfigs: async () => {
    try {
      const response = await api.get('/groups/config/paths');
      return response.data;
    } catch (error) {
      console.error('Error fetching all group directory configs:', error.response ? error.response.data : error.message);
      throw error.response ? error.response.data : error;
    }
  },

  getGroupDirectoryPath: async (groupId) => {
    try {
      const response = await api.get(`/groups/${groupId}/config/path`);
      return response.data; // Expects { groupId: string, path: string }
    } catch (error) {
      console.error(`Error fetching directory path for group ${groupId}:`, error.response ? error.response.data : error.message);
      // If 404 (path not set), it might be a normal case, component can handle error.response.status
      throw error.response ? error.response.data : error;
    }
  },

  setGroupDirectoryPath: async (groupId, directoryPath) => {
    try {
      const response = await api.put(`/groups/${groupId}/config/path`, { path: directoryPath });
      return response.data;
    } catch (error) {
      console.error(`Error setting directory path for group ${groupId}:`, error.response ? error.response.data : error.message);
      throw error.response ? error.response.data : error;
    }
  }
};

export default groupService; 