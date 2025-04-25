/**
 * Runtime Configuration for Frontend
 * 
 * This script runs in the browser and determines the backend API URL
 * dynamically based on where the app is being served from.
 */
window.runtimeConfig = {
  // When frontend is served by the backend, API calls should go to the same origin
  API_URL: window.location.origin
};