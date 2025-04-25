import API from '../utils/api';
import { jwtDecode } from 'jwt-decode';  // Updated import syntax for jwt-decode v4

// Authentication services
const AuthService = {
  // Login user
  async login(email, password) {
    try {
      const response = await API.post('/api/auth/login', { email, password });
      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
      }
      return response.data;
    } catch (error) {
      throw error.response ? error.response.data : { message: 'Server error' };
    }
  },

  // Register user (admin only)
  async register(userData) {
    try {
      const response = await API.post('/api/auth/register', userData);
      return response.data;
    } catch (error) {
      throw error.response ? error.response.data : { message: 'Server error' };
    }
  },

  // Logout user
  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  // Get current user
  getCurrentUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },

  // Check if user is logged in
  isLoggedIn() {
    const token = localStorage.getItem('token');
    if (!token) return false;
    
    try {
      // Check token expiration - Updated for jwt-decode v4
      const decoded = jwtDecode(token);
      const currentTime = Date.now() / 1000;
      
      if (decoded.exp < currentTime) {
        this.logout();
        return false;
      }
      
      return true;
    } catch (error) {
      this.logout();
      return false;
    }
  },

  // Check if user has specific role
  hasRole(role) {
    const user = this.getCurrentUser();
    return user && user.role === role;
  },

  // Get all users (admin only)
  async getAllUsers() {
    try {
      const response = await API.get('/api/auth/users');
      return response.data;
    } catch (error) {
      throw error.response ? error.response.data : { message: 'Server error' };
    }
  },

  // Update user (admin or self)
  async updateUser(userId, userData) {
    try {
      const response = await API.put(`/api/auth/users/${userId}`, userData);
      
      // If current user was updated, update local storage
      const currentUser = this.getCurrentUser();
      if (currentUser && currentUser.id === userId) {
        localStorage.setItem('user', JSON.stringify(response.data));
      }
      
      return response.data;
    } catch (error) {
      throw error.response ? error.response.data : { message: 'Server error' };
    }
  },

  // Delete user (admin only)
  async deleteUser(userId) {
    try {
      const response = await API.delete(`/api/auth/users/${userId}`);
      return response.data;
    } catch (error) {
      throw error.response ? error.response.data : { message: 'Server error' };
    }
  }
};

export default AuthService;