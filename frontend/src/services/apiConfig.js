/**
 * API Configuration Service
 * Centralized management of API configuration across the application
 */

// Get API base URL from different sources with priority
const getBaseUrl = () => {
  // First priority: Runtime configuration (set by the server at serve time)
  if (window.runtimeConfig && window.runtimeConfig.API_URL) {
    return window.runtimeConfig.API_URL;
  }
  
  // Second priority: Environment variable
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }
  
  // Third priority: Local storage (user-configured)
  const storedApiUrl = localStorage.getItem('apiBaseUrl');
  if (storedApiUrl) {
    return storedApiUrl;
  }
  
  // Default fallback - use current origin which works when frontend and backend are on same server
  return window.location.origin;
};

// Initialize the API config with values from environment variables or localStorage
let currentApiConfig = {
  baseUrl: getBaseUrl(),
  timeout: 30000,
  withCredentials: true
};

/**
 * Get the current API configuration
 */
export function getApiConfig() {
  return { ...currentApiConfig };
}

/**
 * Update the API base URL across the application
 */
export function updateApiBaseUrl(newBaseUrl) {
  if (!newBaseUrl || !newBaseUrl.trim()) {
    return false;
  }
  
  try {
    // Validate URL format
    new URL(newBaseUrl);
    
    // Update local configuration
    currentApiConfig.baseUrl = newBaseUrl;
    
    // Store in localStorage for persistence
    localStorage.setItem('apiBaseUrl', newBaseUrl);
    
    // Dispatch event so other parts of the app can react
    window.dispatchEvent(new CustomEvent('apiConfigChanged', { 
      detail: { baseUrl: newBaseUrl } 
    }));
    
    console.log(`API base URL updated to: ${newBaseUrl}`);
    return true;
  } catch (error) {
    console.error('Invalid URL format:', error);
    return false;
  }
}

export default {
  getApiConfig,
  updateApiBaseUrl,
  getBaseUrl
};