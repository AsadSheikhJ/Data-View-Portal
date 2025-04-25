import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Chip,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Alert,
  Snackbar,
  CircularProgress
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { getApiConfig } from '../services/apiConfig';

// Get the API URL from our centralized configuration
const getAPIUrl = () => {
  // First check for runtime configuration (from window.runtimeConfig)
  if (window.runtimeConfig && window.runtimeConfig.API_URL) {
    return window.runtimeConfig.API_URL;
  }
  
  // Then fall back to our centralized API config
  return getApiConfig().baseUrl;
};

// Define API URL
const API_URL = getAPIUrl();

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState('add'); // 'add' or 'edit'
  const [currentUser, setCurrentUser] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'user',
    permissions: {
      view: true,
      edit: false,
      download: false
    }
  });
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  const { user: currentLoggedUser, token } = useAuth();

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      // Get token from localStorage if not available in context
      const authToken = token || localStorage.getItem('token');
      
      if (!authToken) {
        throw new Error('Authentication token not available');
      }
      
      const response = await fetch(`${API_URL}/api/users`, {
        headers: { 
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      
      // Check if response is ok
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Error response (${response.status}):`, errorText);
        throw new Error(`Server error: ${response.status} ${response.statusText}`);
      }
      
      // Try to parse as JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const textResponse = await response.text();
        console.error('Unexpected non-JSON response:', textResponse);
        throw new Error('Server returned non-JSON response');
      }
      
      const usersData = await response.json();
      
      // Ensure users is always an array
      setUsers(Array.isArray(usersData) ? usersData : []);
      
      setSnackbar({
        open: true,
        message: 'Users loaded successfully',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error fetching users:', error);
      setUsers([]);
      setSnackbar({
        open: true,
        message: 'Failed to load users: ' + error.message,
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleOpenDialog = (mode, user = null) => {
    setDialogMode(mode);
    if (mode === 'edit' && user) {
      setCurrentUser(user);
      setFormData({
        name: user.name,
        email: user.email,
        password: '',
        role: user.role,
        permissions: user.permissions || {
          view: true,
          edit: false,
          download: false
        }
      });
    } else {
      setCurrentUser(null);
      setFormData({
        name: '',
        email: '',
        password: '',
        role: 'user',
        permissions: {
          view: true,
          edit: false,
          download: false
        }
      });
    }
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePermissionChange = (permission) => {
    setFormData(prev => ({
      ...prev,
      permissions: {
        ...prev.permissions,
        [permission]: !prev.permissions[permission]
      }
    }));
  };

  const handleSubmit = async () => {
    try {
      // Validate form data
      if (!formData.name || !formData.email) {
        setSnackbar({
          open: true,
          message: 'Name and email are required',
          severity: 'error'
        });
        return;
      }

      if (dialogMode === 'add' && !formData.password) {
        setSnackbar({
          open: true,
          message: 'Password is required for new users',
          severity: 'error'
        });
        return;
      }

      // Get token from localStorage if not available in context
      const authToken = token || localStorage.getItem('token');
      
      if (!authToken) {
        setSnackbar({
          open: true,
          message: 'You must be logged in to perform this action',
          severity: 'error'
        });
        return;
      }
      
      // Prepare API call
      const apiEndpoint = `${API_URL}/api/users${dialogMode === 'edit' && currentUser ? `/${currentUser.id}` : ''}`;
      const method = dialogMode === 'add' ? 'POST' : 'PUT';
      
      console.log(`${method} request to ${apiEndpoint}`);
      console.log('Form data:', { ...formData, password: formData.password ? '******' : '' });
      
      const response = await fetch(apiEndpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`
        },
        body: JSON.stringify(formData)
      });
      
      if (!response.ok) {
        const contentType = response.headers.get('content-type');
        
        if (contentType && contentType.includes('application/json')) {
          const errorData = await response.json();
          throw new Error(errorData.message || `Server error: ${response.status}`);
        } else {
          throw new Error(`Server error: ${response.status} ${response.statusText}`);
        }
      }
      
      const data = await response.json();
      console.log('API Response:', data);
      
      // Success message
      setSnackbar({
        open: true,
        message: `User ${dialogMode === 'add' ? 'created' : 'updated'} successfully`,
        severity: 'success'
      });
      
      handleCloseDialog();
      fetchUsers(); // Refresh the list
    } catch (error) {
      console.error('Error submitting form:', error);
      
      setSnackbar({
        open: true,
        message: `Failed to save user: ${error.message}`,
        severity: 'error'
      });
    }
  };

  const handleDeleteUser = async (userId) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        const authToken = token || localStorage.getItem('token');
        
        if (!authToken) {
          throw new Error('Authentication token not available');
        }
        
        const response = await fetch(`${API_URL}/api/users/${userId}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${authToken}`
          }
        });
        
        if (!response.ok) {
          const contentType = response.headers.get('content-type');
          
          if (contentType && contentType.includes('application/json')) {
            const errorData = await response.json();
            throw new Error(errorData.message || `Server error: ${response.status}`);
          } else {
            throw new Error(`Server error: ${response.status} ${response.statusText}`);
          }
        }
        
        // Remove the deleted user from the local state
        setUsers(prev => prev.filter(user => user.id !== userId));
        
        setSnackbar({
          open: true,
          message: 'User deleted successfully',
          severity: 'success'
        });
      } catch (error) {
        console.error('Error deleting user:', error);
        setSnackbar({
          open: true,
          message: 'Failed to delete user: ' + error.message,
          severity: 'error'
        });
      }
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 ,paddingTop: 4}}>
        <Typography variant="h4" component="h2">
          User Management
        </Typography>
        <Button
    
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog('add')
          }
        >
          Add User
        </Button>
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Permissions</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {Array.isArray(users) && users.length > 0 ? (
                users.map((user) => (
                  <TableRow key={user.id || Math.random()}>
                    <TableCell>{user.name || 'N/A'}</TableCell>
                    <TableCell>{user.email || 'N/A'}</TableCell>
                    <TableCell>
                      <Chip 
                        label={user.role || 'user'} 
                        color={(user.role === 'admin') ? 'primary' : 'default'}
                      />
                    </TableCell>
                    <TableCell>
                      {user.permissions?.view && <Chip label="View" size="small" sx={{ mr: 0.5 }} />}
                      {user.permissions?.edit && <Chip label="Edit" size="small" color="primary" sx={{ mr: 0.5 }} />}
                      {user.permissions?.download && <Chip label="Download" size="small" color="secondary" />}
                    </TableCell>
                    <TableCell>
                      <IconButton 
                        color="primary"
                        onClick={() => handleOpenDialog('edit', user)}
                      >
                        <EditIcon />
                      </IconButton>
                      <IconButton 
                        color="error" 
                        disabled={user.id === currentLoggedUser?.id}
                        onClick={() => handleDeleteUser(user.id)}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    No users found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* User Form Dialog */}
      <Dialog open={openDialog} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>{dialogMode === 'add' ? 'Add User' : 'Edit User'}</DialogTitle>
        <DialogContent>
          <TextField
            margin="dense"
            label="Name"
            name="name"
            fullWidth
            value={formData.name}
            onChange={handleFormChange}
            required
          />
          <TextField
            margin="dense"
            label="Email"
            name="email"
            type="email"
            fullWidth
            value={formData.email}
            onChange={handleFormChange}
            required
          />
          {dialogMode === 'add' && (
            <TextField
              margin="dense"
              label="Password"
              name="password"
              type="password"
              fullWidth
              value={formData.password}
              onChange={handleFormChange}
              required
            />
          )}
          <FormControl fullWidth margin="dense">
            <InputLabel>Role</InputLabel>
            <Select
              name="role"
              value={formData.role}
              onChange={handleFormChange}
              label="Role"
            >
              <MenuItem value="user">User</MenuItem>
              <MenuItem value="admin">Admin</MenuItem>
            </Select>
          </FormControl>
          
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle1">File Permissions</Typography>
            <FormGroup>
              <FormControlLabel 
                control={
                  <Checkbox 
                    checked={formData.permissions.view} 
                    onChange={() => handlePermissionChange('view')}
                  />
                } 
                label="View Files" 
              />
              <FormControlLabel 
                control={
                  <Checkbox 
                    checked={formData.permissions.edit} 
                    onChange={() => handlePermissionChange('edit')}
                  />
                } 
                label="Edit Files" 
              />
              <FormControlLabel 
                control={
                  <Checkbox 
                    checked={formData.permissions.download} 
                    onChange={() => handlePermissionChange('download')}
                  />
                } 
                label="Download Files" 
              />
            </FormGroup>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" color="primary">
            {dialogMode === 'add' ? 'Add User' : 'Save Changes'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbar.severity} 
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default UserManagement;
