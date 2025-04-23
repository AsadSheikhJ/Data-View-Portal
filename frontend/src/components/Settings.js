import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  Divider,
  Button,
  TextField,
  FormControlLabel,
  Switch,
  Grid,
  Snackbar,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton
} from '@mui/material';
import {
  Brightness4 as DarkModeIcon,
  Brightness7 as LightModeIcon,
  Folder as FolderIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  FolderOpen as FolderOpenIcon
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import fileService from '../services/fileService';

const Settings = ({ darkMode, setDarkMode }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'admin';

  // State for user settings
  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
  });

  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [preferences, setPreferences] = useState({
    darkMode: false,
    notifications: true,
    defaultView: 'grid'
  });

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  const [directories, setDirectories] = useState([]);
  const [newDirectory, setNewDirectory] = useState('');
  const [loading, setLoading] = useState(false);

  const [dirConfig, setDirConfig] = useState({
    filesDir: '',
    rootDirectories: []
  });

  // Add a new state for the root directory path
  const [rootDirectoryPath, setRootDirectoryPath] = useState('');

  // Add API_URL constant
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

  // Load directories on component mount
  useEffect(() => {
    loadDirectories();
    loadDirectoryConfig();
  }, []);

  // Load the current root directory path
  useEffect(() => {
    const loadRootDirectoryPath = async () => {
      try {
        setLoading(true);
        // Get the current directory config using the full URL
        const response = await fetch(`${API_URL}/api/files/config`, {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          // Check if the response is JSON
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const data = await response.json();
            if (data.customDirectoryPath) {
              setRootDirectoryPath(data.customDirectoryPath);
            }
          } else {
            console.warn('Response is not JSON:', await response.text());
            throw new Error('Server returned non-JSON response');
          }
        } else {
          console.error('Failed to fetch directory config:', response.status);
          throw new Error(`Failed with status: ${response.status}`);
        }
      } catch (error) {
        console.error('Error loading root directory path:', error);
        setSnackbar({
          open: true,
          message: `Failed to load root directory configuration: ${error.message}`,
          severity: 'error'
        });
      } finally {
        setLoading(false);
      }
    };
    
    loadRootDirectoryPath();
  }, []);

  const loadDirectories = async () => {
    try {
      setLoading(true);
      const files = await fileService.listFiles();
      const dirs = files.filter(file => file.isDirectory);
      setDirectories(dirs);
    } catch (error) {
      console.error('Error loading directories:', error);
      setSnackbar({
        open: true,
        message: 'Failed to load directories',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadDirectoryConfig = async () => {
    try {
      setLoading(true);
      const config = await fileService.getDirectoryConfig();
      setDirConfig(config);
    } catch (error) {
      console.error('Error loading directory configuration:', error);
      setSnackbar({
        open: true,
        message: 'Failed to load directory configuration',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDirectory = async () => {
    if (!newDirectory) return;

    try {
      setLoading(true);
      await fileService.createDirectory('', newDirectory);
      setNewDirectory('');
      loadDirectories();
      loadDirectoryConfig(); // Refresh directory list
      setSnackbar({
        open: true,
        message: 'Directory created successfully',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error creating directory:', error);
      setSnackbar({
        open: true,
        message: 'Failed to create directory',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteDirectory = async (dirPath) => {
    if (window.confirm(`Are you sure you want to delete the directory "${dirPath}"? All files inside will be deleted.`)) {
      try {
        setLoading(true);
        await fileService.deleteItem(dirPath);
        loadDirectories();
        setSnackbar({
          open: true,
          message: 'Directory deleted successfully',
          severity: 'success'
        });
      } catch (error) {
        console.error('Error deleting directory:', error);
        setSnackbar({
          open: true,
          message: 'Failed to delete directory',
          severity: 'error'
        });
      } finally {
        setLoading(false);
      }
    }
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // Handle profile form changes
  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setProfileForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle password form changes
  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle preference changes
  const handlePreferenceChange = (e) => {
    const { name, value, checked } = e.target;
    setPreferences(prev => ({
      ...prev,
      [name]: e.target.type === 'checkbox' ? checked : value
    }));
  };

  // Handle profile update
  const handleProfileUpdate = (e) => {
    e.preventDefault();
    // Here you would update the user profile in your backend
    setSnackbar({
      open: true,
      message: 'Profile updated successfully!',
      severity: 'success'
    });
  };

  // Handle password update
  const handlePasswordUpdate = (e) => {
    e.preventDefault();
    
    // Validate passwords match
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setSnackbar({
        open: true,
        message: 'New passwords do not match',
        severity: 'error'
      });
      return;
    }

    // Here you would update the password in your backend
    setSnackbar({
      open: true,
      message: 'Password updated successfully!',
      severity: 'success'
    });

    // Reset form
    setPasswordForm({
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    });
  };

  // Handle preferences update
  const handlePreferencesUpdate = (e) => {
    e.preventDefault();
    // Here you would update user preferences in your backend
    setSnackbar({
      open: true,
      message: 'Preferences updated successfully!',
      severity: 'success'
    });
  };

  // Handle setting the new root directory path
  const handleSetRootDirectory = async () => {
    if (!rootDirectoryPath.trim()) {
      setSnackbar({
        open: true,
        message: 'Please enter a valid directory path',
        severity: 'error'
      });
      return;
    }
    
    try {
      setLoading(true);
      
      // Save the new directory path to the configuration with proper URL
      const response = await fetch(`${API_URL}/api/files/config`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ directoryPath: rootDirectoryPath })
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Directory update response:', data);
        
        setSnackbar({
          open: true,
          message: 'Root directory updated successfully. Server restart may be required.',
          severity: 'success'
        });
      } else {
        const errorText = await response.text();
        console.error('Failed to update directory:', errorText);
        throw new Error(`Failed with status: ${response.status}`);
      }
    } catch (error) {
      console.error('Error setting root directory:', error);
      setSnackbar({
        open: true,
        message: `Failed to set root directory: ${error.message}`,
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle snackbar close
  const handleSnackbarClose = () => {
    setSnackbar(prev => ({
      ...prev,
      open: false
    }));
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={3} sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom>
          Settings
        </Typography>
        <Divider sx={{ mb: 3 }} />

        {/* Profile Settings */}
        <Box component="form" onSubmit={handleProfileUpdate} sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            Profile Information
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Name"
                name="name"
                value={profileForm.name}
                onChange={handleProfileChange}
                margin="normal"
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Email"
                name="email"
                type="email"
                value={profileForm.email}
                onChange={handleProfileChange}
                margin="normal"
                disabled // Email cannot be changed in this demo
              />
            </Grid>
            <Grid item xs={12}>
              <Button
                type="submit"
                variant="contained"
                color="primary"
              >
                Update Profile
              </Button>
            </Grid>
          </Grid>
        </Box>

        <Divider sx={{ mb: 3 }} />

        {/* Password Settings */}
        <Box component="form" onSubmit={handlePasswordUpdate} sx={{ mb: 4 }}>
          <Typography variant="h6" gutterBottom>
            Change Password
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Current Password"
                name="currentPassword"
                type="password"
                value={passwordForm.currentPassword}
                onChange={handlePasswordChange}
                margin="normal"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="New Password"
                name="newPassword"
                type="password"
                value={passwordForm.newPassword}
                onChange={handlePasswordChange}
                margin="normal"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Confirm New Password"
                name="confirmPassword"
                type="password"
                value={passwordForm.confirmPassword}
                onChange={handlePasswordChange}
                margin="normal"
              />
            </Grid>
            <Grid item xs={12}>
              <Button
                type="submit"
                variant="contained"
                color="primary"
              >
                Change Password
              </Button>
            </Grid>
          </Grid>
        </Box>

        <Divider sx={{ mb: 3 }} />

        {/* User Preferences */}
        <Box component="form" onSubmit={handlePreferencesUpdate}>
          <Typography variant="h6" gutterBottom>
            Preferences
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={preferences.darkMode}
                    onChange={handlePreferenceChange}
                    name="darkMode"
                    color="primary"
                  />
                }
                label="Dark Mode"
              />
            </Grid>
            <Grid item xs={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={preferences.notifications}
                    onChange={handlePreferenceChange}
                    name="notifications"
                    color="primary"
                  />
                }
                label="Enable Notifications"
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth margin="normal">
                <InputLabel id="default-view-label">Default View</InputLabel>
                <Select
                  labelId="default-view-label"
                  id="default-view"
                  name="defaultView"
                  value={preferences.defaultView}
                  onChange={handlePreferenceChange}
                  label="Default View"
                >
                  <MenuItem value="list">List</MenuItem>
                  <MenuItem value="grid">Grid</MenuItem>
                  <MenuItem value="compact">Compact</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <Button
                type="submit"
                variant="contained"
                color="primary"
              >
                Save Preferences
              </Button>
            </Grid>
          </Grid>
        </Box>

        <Divider sx={{ mb: 3 }} />

        {/* Appearance Settings */}
        <Paper sx={{ p: 3, mb: 3 }}>
          <Typography variant="h6" gutterBottom>
            Appearance
          </Typography>
          
          <FormControlLabel
            control={
              <Switch 
                checked={darkMode} 
                onChange={() => setDarkMode(!darkMode)} 
                color="primary"
              />
            }
            label={darkMode ? "Dark Mode" : "Light Mode"}
          />
          
          <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
            {darkMode ? <DarkModeIcon /> : <LightModeIcon />}
            <Typography variant="body2" sx={{ ml: 1 }}>
              {darkMode 
                ? "Dark mode is easier on the eyes in low-light environments." 
                : "Light mode provides better visibility in bright environments."}
            </Typography>
          </Box>
        </Paper>

        {/* File System Settings */}
        {isAdmin && (
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              File System Configuration
            </Typography>
            
            <Typography variant="body2" gutterBottom color="textSecondary">
              Current root directory: <code>{rootDirectoryPath || 'Using default directory'}</code>
            </Typography>

            <Divider sx={{ my: 2 }} />
            
            <Typography variant="h6" gutterBottom>
              Set Root Directory
            </Typography>
            
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <TextField
                label="Root Directory Path"
                variant="outlined"
                size="small"
                value={rootDirectoryPath}
                onChange={(e) => setRootDirectoryPath(e.target.value)}
                placeholder="C:\path\to\directory"
                sx={{ mr: 2, flexGrow: 1 }}
              />
              <Button
                variant="contained"
                onClick={handleSetRootDirectory}
                disabled={!rootDirectoryPath.trim() || loading}
              >
                Update Directory
              </Button>
            </Box>
            
            <Typography variant="caption" color="textSecondary">
              Note: Setting a new root directory may require restarting the server to take effect.
            </Typography>
          </Paper>
        )}

        <Box sx={{ mt: 4 }}>
          <Button
            variant="outlined"
            color="primary"
            onClick={() => navigate('/dashboard')}
          >
            Back to Dashboard
          </Button>
        </Box>
      </Paper>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          onClose={handleSnackbarClose}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default Settings;
