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
    const files = await listFiles('');
    
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

// List files in a directory
const listFiles = async (directory = '') => {
  try {
    
    // Make sure directory is properly encoded for URL
    const encodedDir = encodeURIComponent(directory);
    const url = `/api/files?directory=${encodedDir}`;
    
    const response = await api.get(url);
    
    // Ensure we return an array
    const files = Array.isArray(response.data) ? response.data : [];
    
    return files;
  } catch (error) {
    console.error('Error listing files:', error);
    // Return empty array instead of throwing to avoid breaking the UI
    return [];
  }
};

// Upload a file
const uploadFile = async (file, directory = '') => {
  try {
    const formData = new FormData();
    formData.append('file', file);
    
    console.log(`Uploading file to directory: ${directory}`);
    
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
    console.error('Error uploading file:', error);
    throw error;
  }
};

// Download a file
const downloadFile = async (filePath) => {
  try {
    console.log(`Downloading file: ${filePath}`);
    
    const response = await api.get(`/api/files/download/${encodeURIComponent(filePath)}`, {
      responseType: 'blob'
    });
    
    // Check if the response is an error message in JSON format
    // Only attempt to parse as JSON if it's actually JSON content type
    const contentType = response.headers['content-type'];
    if (contentType && contentType.includes('application/json')) {
      try {
        const text = await response.data.text();
        const errorData = JSON.parse(text);
        if (errorData.error || errorData.message) {
          throw new Error(errorData.message || errorData.error || 'Permission denied');
        }
      } catch (parseError) {
        // If we can't parse the JSON, just continue with download
        console.log("Not a JSON error response, continuing with download");
      }
    }
    
    // Create a URL for the blob
    const url = window.URL.createObjectURL(new Blob([response.data]));
    
    // Create a link and trigger download
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filePath.split('/').pop());
    document.body.appendChild(link);
    link.click();
    link.remove();
    
    // Clean up
    window.URL.revokeObjectURL(url);
    
    return { success: true };
  } catch (error) {
    console.error('Error downloading file:', error);
    // Return a structured error object instead of throwing
    return {
      success: false,
      error: error.response?.status === 403 
        ? "You don't have permission to download files"
        : error.message || 'Failed to download file'
    };
  }
};

// Download a folder as zip
const downloadFolder = async (folderPath) => {
  try {
    console.log(`Downloading folder as zip: ${folderPath}`);
    
    const response = await api.get(`/api/files/download-folder/${encodeURIComponent(folderPath)}`, {
      responseType: 'blob'
    });
    
    // Check if the response is an error message in JSON format
    const contentType = response.headers['content-type'];
    if (contentType && contentType.includes('application/json')) {
      const text = await response.data.text();
      const errorData = JSON.parse(text);
      throw new Error(errorData.message || 'Permission denied');
    }
    
    // Create a URL for the blob
    const url = window.URL.createObjectURL(new Blob([response.data]));
    
    // Create a link and trigger download
    const link = document.createElement('a');
    link.href = url;
    const folderName = folderPath.split('/').pop() || 'folder';
    link.setAttribute('download', `${folderName}.zip`);
    document.body.appendChild(link);
    link.click();
    link.remove();
    
    // Clean up
    window.URL.revokeObjectURL(url);
    
    return { success: true };
  } catch (error) {
    console.error('Error downloading folder:', error);
    // Return a structured error object instead of throwing
    return {
      success: false,
      error: error.response?.status === 403 
        ? "You don't have permission to download folders"
        : error.message || 'Failed to download folder'
    };
  }
};

// Rename a file or folder
const renameItem = async (oldPath, newName) => {
  try {
    console.log(`Renaming ${oldPath} to ${newName}`);
    
    const response = await api.put('/api/files/rename', {
      oldPath,
      newName
    });
    
    return response.data;
  } catch (error) {
    console.error('Error renaming item:', error);
    throw error;
  }
};

// Delete a file or directory
const deleteItem = async (path) => {
  try {
    console.log(`Deleting item: ${path}`);
    const response = await api.delete(`/api/files/${encodeURIComponent(path)}`);
    return response.data;
  } catch (error) {
    console.error('Error deleting item:', error);
    throw error;
  }
};

// Create a new directory
const createDirectory = async (parentPath, name) => {
  try {
    const dirPath = parentPath ? `${parentPath}/${name}` : name;
    console.log(`Creating directory: ${dirPath}`);
    
    const response = await api.post('/api/files/directory', { 
      name,
      path: dirPath
    });
    
    return response.data;
  } catch (error) {
    console.error('Error creating directory:', error);
    throw error;
  }
};

// Export functions
const fileService = {
  listFiles,
  uploadFile,
  downloadFile,
  downloadFolder,  // New function
  deleteItem,
  createDirectory,
  renameItem,       // New function
  formatFileSize,
  getDirectoryConfig,
  updateDirectoryConfig,
  getRootDirectories
};

export default fileService;