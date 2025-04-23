import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_URL,
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

// Simplified directory config handling - instead of using a separate endpoint
// we'll use the root directory listing
const getDirectoryConfig = async () => {
  try {
    // Get the file listing directly instead of using a dedicated config endpoint
    const files = await listFiles('');
    const rootDirectories = files
      .filter(file => file.isDirectory)
      .map(dir => ({
        name: dir.name,
        path: dir.path
      }));
    
    return {
      filesDir: '',
      rootDirectories
    };
  } catch (error) {
    console.warn('Could not fetch directory config, using defaults', error);
    return {
      filesDir: '',
      rootDirectories: []
    };
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
    console.log(`Listing files in directory: ${directory}`);
    
    // Make sure directory is properly encoded for URL
    const encodedDir = encodeURIComponent(directory);
    const url = `/api/files?directory=${encodedDir}`;
    
    const response = await api.get(url);
    
    // Ensure we return an array
    const files = Array.isArray(response.data) ? response.data : [];
    console.log('Files API response:', files);
    
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
    
    return true;
  } catch (error) {
    console.error('Error downloading file:', error);
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
  deleteItem,
  createDirectory,
  formatFileSize,
  getDirectoryConfig,
  getRootDirectories
};

export default fileService;