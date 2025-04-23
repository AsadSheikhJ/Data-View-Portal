import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  TextField, 
  Button, 
  Card, 
  CardContent, 
  Container,
  Grid,
  Paper,
  Alert,
  Snackbar
} from '@mui/material';
import api from '../utils/api';
import { useAuth } from '../contexts/AuthContext';

const Settings = () => {
  const [directoryPath, setDirectoryPath] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    // Fetch the current directory path
    const fetchDirectory = async () => {
      try {
        setLoading(true);
        const response = await api.get('/files/get-directory');
        if (response.data && response.data.directoryPath) {
          setDirectoryPath(response.data.directoryPath);
        }
      } catch (error) {
        console.error('Error fetching directory:', error);
        setError('Failed to load current directory configuration');
      } finally {
        setLoading(false);
      }
    };

    fetchDirectory();
  }, []);

  const handleSave = async () => {
    try {
      setLoading(true);
      setError('');
      setMessage('');
      
      const response = await api.post('/files/set-directory', { directoryPath });
      setMessage(response.data.message);
      setSuccess(true);
    } catch (error) {
      setError(error.response?.data?.error || 'Failed to update directory');
      setSuccess(false);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseSnackbar = () => {
    setSuccess(false);
  };

  // Only allow administrators to change settings
  if (user && user.role !== 'admin') {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h5" component="h1" gutterBottom>
            Settings
          </Typography>
          <Alert severity="warning">
            Only administrators can access and modify settings.
          </Alert>
        </Paper>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 8 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Settings
        </Typography>
        
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Typography variant="h6" component="h2" gutterBottom>
              Root Directory Configuration
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Set the directory path that will be used as the root for file browsing.
              This directory must exist on the server.
            </Typography>
            
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Directory Path"
                  variant="outlined"
                  value={directoryPath}
                  onChange={(e) => setDirectoryPath(e.target.value)}
                  placeholder="e.g., C:\path\to\directory"
                  helperText="Enter an absolute path to a directory on the server"
                  disabled={loading}
                />
              </Grid>
              <Grid item xs={12}>
                <Button 
                  variant="contained" 
                  color="primary" 
                  onClick={handleSave}
                  disabled={loading || !directoryPath}
                >
                  Save Configuration
                </Button>
              </Grid>
            </Grid>
            
            {error && (
              <Box mt={2}>
                <Alert severity="error">{error}</Alert>
              </Box>
            )}
          </CardContent>
        </Card>
      </Paper>
      
      <Snackbar
        open={success}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
      >
        <Alert onClose={handleCloseSnackbar} severity="success" sx={{ width: '100%' }}>
          {message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default Settings;