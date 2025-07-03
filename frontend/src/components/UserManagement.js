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
  Delete as DeleteIcon,
  People as PeopleIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { userApi } from '../services/api';

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

  const { user: currentLoggedUser } = useAuth();

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await userApi.getAllUsers();
      setUsers(Array.isArray(response.data) ? response.data : []);
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
        message: 'Failed to load users: ' + (error.response?.data?.message || error.message),
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  }, []);

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

      let response;
      if (dialogMode === 'add') {
        response = await userApi.createUser(formData);
      } else {
        response = await userApi.updateUser(currentUser.id, formData);
      }

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
        message: `Failed to save user: ${error.response?.data?.message || error.message}`,
        severity: 'error'
      });
    }
  };

  const handleDeleteUser = async (userId) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        await userApi.deleteUser(userId);
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
          message: 'Failed to delete user: ' + (error.response?.data?.message || error.message),
          severity: 'error'
        });
      }
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 'calc(100vh - 200px)' }}>
        <CircularProgress />
        <Typography sx={{ ml: 2 }}>Loading users...</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 1, md: 2 } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" component="h2" sx={{ fontWeight: 600 }}>
          Members
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpenDialog('add')}
          sx={{ fontWeight: 500 }}
        >
          Add User
        </Button>
      </Box>

      {users.length === 0 ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', py: 5, border: '1px dashed', borderColor: 'divider', borderRadius: 1 }}>
          <PeopleIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">No users found.</Typography>
          <Typography color="text.secondary">Click "Add User" to create the first one.</Typography>
        </Box>
      ) : (
        <TableContainer sx={{ borderRadius: 1.5 }}>
          <Table aria-label="user management table">
            <TableHead sx={{ bgcolor: (theme) => theme.palette.mode === 'dark' ? 'grey.800' : 'grey.100' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold' }}>Name</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Email</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Role</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Permissions</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold' }}>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.id} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                  <TableCell component="th" scope="row">
                    {user.name}
                  </TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    <Chip 
                      label={user.role} 
                      size="small" 
                      color={user.role === 'admin' ? 'primary' : 'default'} 
                      sx={{ textTransform: 'capitalize', fontWeight: 500 }}
                    />
                  </TableCell>
                  <TableCell>
                    {user.permissions && (
                      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        {user.permissions.view && <Chip label="View" size="small" variant="outlined" sx={{ bgcolor: 'info.lighter', color: 'info.darker', borderColor: 'info.main' }} />}
                        {user.permissions.edit && <Chip label="Edit" size="small" variant="outlined" sx={{ bgcolor: 'success.lighter', color: 'success.darker', borderColor: 'success.main' }} />}
                        {user.permissions.download && <Chip label="Download" size="small" variant="outlined" sx={{ bgcolor: 'secondary.lighter', color: 'secondary.darker', borderColor: 'secondary.main' }} />}
                      </Box>
                    )}
                  </TableCell>
                  <TableCell align="right">
                    <IconButton 
                      size="small" 
                      onClick={() => handleOpenDialog('edit', user)} 
                      disabled={currentLoggedUser && currentLoggedUser.id === user.id && user.role === 'admin'} // Prevent admin from editing self to lose admin role by mistake
                      title={currentLoggedUser && currentLoggedUser.id === user.id && user.role === 'admin' ? "Cannot edit current admin user directly" : "Edit user"}
                    >
                      <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton 
                      size="small" 
                      onClick={() => handleDeleteUser(user.id)} 
                      disabled={currentLoggedUser && currentLoggedUser.id === user.id} // Prevent self-deletion
                      title={currentLoggedUser && currentLoggedUser.id === user.id ? "Cannot delete self" : "Delete user"}
                      color="error"
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
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
