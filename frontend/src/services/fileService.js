import axios from 'axios';
import { getApiConfig } from './apiConfig';

// Get the API URL from our centralized configuration
const getAPIUrl = () => {
  // First check for runtime configuration (from window.runtimeConfig)
  // if (window.runtimeConfig && window.runtimeConfig.API_URL) {
  //   return window.runtimeConfig.API_URL;
  // }
  
  // Then fall back to our centralized API config
  return getApiConfig().baseUrl;
};

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
    
    // Always ensure URLs start with /api
    if (!config.url.startsWith('/api/')) {
      config.url = `/api${config.url.startsWith('/') ? '' : '/'}${config.url}`;
    }
    
    return config;
  },
  (error) => Promise.reject(error)
);

// Format file size to human-readable format
const formatFileSize = (bytes) => {
  if (!bytes || isNaN(bytes) || bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Debug API URL
console.log('API URL configured as:', getAPIUrl());

// Listen for API config changes
window.addEventListener('apiConfigChanged', () => {
  console.log('API configuration changed, updating fileService to use:', getAPIUrl());
  api.defaults.baseURL = getAPIUrl();
});

// Get directory configuration - with debug logging
const getDirectoryConfig = async () => {
  try {
    // Use the axios instance which has the current baseURL
    const response = await api.get('/api/files/config');
    
    return response.data;
  } catch (error) {
    console.error('Error fetching directory config:', error);
    // Return default values
    return {
      filesDir: '',
      customDirectoryPath: '',
      isUsingCustomPath: false
    };
  }
};

// Update directory configuration - with better error handling
const updateDirectoryConfig = async (directoryPath) => {
  try {
    console.log('Updating directory configuration to:', directoryPath);
    
    const response = await api.post('/api/files/config', { directoryPath });
    
    return response.data;
  } catch (error) {
    console.error('Error updating directory config:', error);
    throw error;
  }
};

// Get root directories - simpler approach that just lists the root directory
const getRootDirectories = async () => {
  try {
    console.log('Getting root directories');
    
    // Get all files/folders from root directory
    const files = await listFiles('', '');
    
    // Filter to only include directories
    const directories = files
      .filter(file => file.isDirectory)
      .map(dir => ({
        name: dir.name,
        path: dir.path
      }));
    
    console.log('Root directories found:', directories);
    return directories;
  } catch (error) {
    console.error('Error getting root directories:', error);
    return [];
  }
};

// List files in a directory - NOW GROUP AWARE
const listFiles = async (directory = '', groupId) => {
  try {
    if (!groupId) {
      // console.warn('listFiles called without groupId. Returning empty array.');
      // Depending on UI, you might throw an error or handle this differently.
      return []; // Or throw new Error('Group ID is required');
    }
    const encodedDir = encodeURIComponent(directory);
    const url = `/api/files?directory=${encodedDir}&groupId=${groupId}`;
    
    const response = await api.get(url);
    const files = Array.isArray(response.data) ? response.data : [];
    return files;
  } catch (error) {
    console.error('Error listing files:', error);
    return [];
  }
};

// Upload a file
const uploadFile = async (file, directory = '') => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    
    // console.log(`Uploading file to directory: ${directory}`);
    
    const response = await api.post(
      `/api/files/upload?directory=${encodeURIComponent(directory)}`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      }
    );
    
    return response.data;
  } catch (error) {
    // console.error('Error uploading file:', error);
    throw error;
  }
};

// Upload multiple files with progress - NOW GROUP AWARE
const uploadMultipleFilesWithProgress = async (files, directory = '', groupId, onUploadProgress) => {
  try {
    if (!groupId) {
      throw new Error('Group ID is required for upload');
    }
    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });

    const response = await api.post(
      `/api/files/upload?directory=${encodeURIComponent(directory)}&groupId=${groupId}`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: progressEvent => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          if (onUploadProgress) {
            onUploadProgress(percentCompleted);
          }
        }
      }
    );
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Download a file - groupId as query param
const downloadFile = async (filePath, groupId) => {
  try {
    if (!groupId) throw new Error('Group ID is required for downloading a file');
    const url = `/api/files/download/${encodeURIComponent(filePath)}?groupId=${groupId}`;
    const response = await api.get(url, {
      responseType: 'blob',
      validateStatus: function (status) {
        return status < 500;
      }
    });
    if (response.status >= 400) {
      const contentType = response.headers['content-type'];
      let errorMessage = 'Failed to download file.';
      if (contentType && contentType.includes('application/json')) {
        try {
          const errorText = await response.data.text();
          const errorData = JSON.parse(errorText);
          errorMessage = errorData.message || `Error ${response.status}`;
        } catch (e) {
          errorMessage = `Server error (${response.status}), unable to parse error details.`;
        }
      } else {
        try {
            const errorText = await response.data.text();
            errorMessage = errorText || `Server error (${response.status})`;
        } catch (e) {
            errorMessage = `Server error (${response.status})`;
        }
      }
      throw new Error(errorMessage);
    }
    const blobUrl = window.URL.createObjectURL(response.data);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.setAttribute('download', filePath.split('/').pop());
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(blobUrl);
  } catch (error) {
    throw error;
  }
};

// Download a folder as zip - groupId as query param
const downloadFolder = async (folderPath, groupId) => {
  try {
    if (!groupId) throw new Error('Group ID is required for downloading a folder');
    const url = `/api/files/download-folder/${encodeURIComponent(folderPath)}?groupId=${groupId}`;
    const response = await api.get(url, {
      responseType: 'blob'
    });
    if (response.status >= 400) {
        throw new Error(`Error ${response.status} downloading folder.`);
    }
    const contentType = response.headers['content-type'];
    if (contentType && contentType.includes('application/json')) {
      const text = await response.data.text();
      const errorData = JSON.parse(text);
      throw new Error(errorData.message || 'Permission denied or error downloading folder');
    }
    const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = blobUrl;
    const zipFolderName = folderPath.split('/').pop() || 'archive';
    link.setAttribute('download', `${zipFolderName}.zip`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(blobUrl);
    return { success: true };
  } catch (error) {
    console.error('Error downloading folder:', error);
    throw error;
  }
};

// Rename a file or folder - groupId in body (already correct)
const renameItem = async (oldPath, newName, groupId) => {
  try {
    if (!groupId) {
      throw new Error('Group ID is required for renaming an item');
    }
    const response = await api.put('/api/files/rename', {
      oldPath, 
      newName,
      groupId
    });
    return response.data;
  } catch (error) {
    console.error('Error renaming item:', error);
    throw error;
  }
};

// Delete a file or directory - groupId as query param
const deleteItem = async (itemPath, groupId) => {
  try {
    if (!groupId) {
      throw new Error('Group ID is required for deleting an item');
    }
    const response = await api.delete(`/api/files/${encodeURIComponent(itemPath)}?groupId=${groupId}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting item:', error);
    throw error;
  }
};

// Create a new directory - NOW GROUP AWARE
const createDirectory = async (parentPath, name, groupId) => {
  try {
    if (!groupId) {
      throw new Error('Group ID is required for creating a directory');
    }
    // const dirPath = parentPath ? `${parentPath}/${name}` : name; // This was the old logic
    // Backend now expects parentPath to be relative to group root, and name separately.
    const response = await api.post('/api/files/directory', { 
      name,
      path: parentPath, // This is the relative path *within* the group
      groupId
    });
    return response.data;
  } catch (error) {
    console.error('Error creating directory:', error);
    throw error;
  }
};

// New function to get group subdirectories
const getGroupSubdirectories = async (groupId) => {
  if (!groupId) {
    throw new Error('Group ID is required to fetch subdirectories.');
  }
  try {
    const response = await api.get(`/api/files/group-subdirectories?groupId=${groupId}`);
    return response.data; // Expects an array of subdirectory names
  } catch (error) {
    console.error(`Error fetching subdirectories for group ${groupId}:`, error);
    throw error.response?.data || new Error('Failed to fetch group subdirectories.');
  }
};

// Export functions
const fileService = {
  api,
  listFiles,
  uploadFile,
  uploadMultipleFilesWithProgress,
  downloadFile,
  downloadFolder,  // New function
  deleteItem,
  createDirectory,
  renameItem,       // New function
  formatFileSize,
  getDirectoryConfig,
  updateDirectoryConfig,
  getRootDirectories,
  getGroupSubdirectories
};

export default fileService;