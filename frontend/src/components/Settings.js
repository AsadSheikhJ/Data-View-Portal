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

  // Simplify the Settings component to reduce errors
  useEffect(() => {
    // Combine the two useEffects into one
    const loadSettings = async () => {
      try {
        setLoading(true);
        
        // Get root directory path
        try {
          const config = await fileService.getDirectoryConfig();
          if (config.customDirectoryPath) {
            setRootDirectoryPath(config.customDirectoryPath);
          }
        } catch (configError) {
          console.warn('Error loading directory config, using empty value:', configError);
        }
        
        // Load directories
        try {
          const files = await fileService.listFiles();
          const dirs = files.filter(file => file.isDirectory);
          setDirectories(dirs);
        } catch (dirError) {
          console.warn('Error loading directories:', dirError);
        }
      } catch (error) {
        console.error('Error loading settings:', error);
        setSnackbar({
          open: true,
          message: 'Failed to load settings',
          severity: 'error'
        });
      } finally {
        setLoading(false);
      }
    };
    
    loadSettings();
  }, []);

  // Add these functions that were previously removed
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
      if (config.customDirectoryPath) {
        setRootDirectoryPath(config.customDirectoryPath);
      }
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
      
      // Use fileService instead of direct fetch
      await fileService.updateDirectoryConfig(rootDirectoryPath);
      
      // Refresh file listings
      try {
        await fileService.listFiles('');
      } catch (refreshError) {
        console.warn('Error refreshing files after directory change:', refreshError);
      }
      
      setSnackbar({
        open: true,
        message: 'Root directory updated successfully',
        severity: 'success'
      });
    } catch (error) {
      console.error('Error setting root directory:', error.message);
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

        {/* File System Settings */}
        {isAdmin && (
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              File System Configuration
            </Typography>
            
            <Typography variant="body2" gutterBottom color="textSecondary">
              Current root directory: <code>{rootDirectoryPath || 'Using default directory'}</code>
            </Typography>

            
            <Alert severity="error" sx={{ mt: 2, mb: 2 }}>
              <Typography variant="body2">
              <strong>DANGER:</strong> Change the root directory with extreme caution. Setting an incorrect path could cause system instability, data access issues, or application failure.
              </Typography>
            </Alert>

            <Divider sx={{ my: 2 }} />
            
            <Typography variant="h6" gutterBottom>
              Set Root Directory
            </Typography>
            
            
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <TextField
                label="Root Directory Path"
                variant="outlined"
                size="small"
                // value={rootDirectoryPath}
                onChange={(e) => setRootDirectoryPath(e.target.value)}
                placeholder="DriveLetter:\path\to\directory"
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
              Note: Setting a new root directory may sometimes require restarting the server to take effect. If not working.
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
