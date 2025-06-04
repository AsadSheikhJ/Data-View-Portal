import React, { useState, useEffect, useCallback } from 'react';
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
  Snackbar,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem
} from '@mui/material';
import groupService from '../services/groupService';
import { useAuth } from '../contexts/AuthContext';

const Settings = () => {
  const { user } = useAuth();

  // State for group path management
  const [groups, setGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [currentGroupPathInput, setCurrentGroupPathInput] = useState('');
  const [initialGroupPath, setInitialGroupPath] = useState(''); // To track if path has changed
  
  const [isLoadingGroups, setIsLoadingGroups] = useState(false);
  const [isLoadingPath, setIsLoadingPath] = useState(false);
  const [isSavingPath, setIsSavingPath] = useState(false);
  
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [snackbarOpen, setSnackbarOpen] = useState(false);

  // Fetch all groups on component mount
  useEffect(() => {
    if (user && user.role === 'admin') {
      const fetchGroups = async () => {
        setIsLoadingGroups(true);
        try {
          const fetchedGroups = await groupService.getAllGroups();
          setGroups(fetchedGroups || []);
        } catch (err) {
          setError('Failed to load groups. ' + (err.message || ''));
          console.error('Error fetching groups:', err);
        }
        setIsLoadingGroups(false);
      };
      fetchGroups();
    }
  }, [user]);

  // Fetch directory path for the selected group
  const fetchGroupPath = useCallback(async (groupId) => {
    if (!groupId) {
        setCurrentGroupPathInput('');
        setInitialGroupPath('');
        return;
    }
    setIsLoadingPath(true);
    setError('');
    try {
      const data = await groupService.getGroupDirectoryPath(groupId);
      setCurrentGroupPathInput(data.path || '');
      setInitialGroupPath(data.path || '');
    } catch (err) {
      if (err.message && err.message.includes('not configured')) { // Handle 404 specifically if path not set
        setCurrentGroupPathInput('');
        setInitialGroupPath('');
      } else {
        setError(`Failed to load path for group ${groupId}. ` + (err.message || ''));
        console.error('Error fetching group path:', err);
        setCurrentGroupPathInput('');
        setInitialGroupPath('');
      }
    }
    setIsLoadingPath(false);
  }, []);

  useEffect(() => {
    if (selectedGroupId) {
      fetchGroupPath(selectedGroupId);
    } else {
      setCurrentGroupPathInput('');
      setInitialGroupPath('');
    }
  }, [selectedGroupId, fetchGroupPath]);

  const handleGroupChange = (event) => {
    setSelectedGroupId(event.target.value);
  };

  const handlePathInputChange = (event) => {
    setCurrentGroupPathInput(event.target.value);
  };

  const handleSaveGroupPath = async () => {
    if (!selectedGroupId || !currentGroupPathInput) {
      setError('Group and path are required.');
      return;
    }
    setIsSavingPath(true);
    setError('');
    setSuccessMessage('');
    try {
      await groupService.setGroupDirectoryPath(selectedGroupId, currentGroupPathInput);
      setInitialGroupPath(currentGroupPathInput); // Update initial path to reflect saved state
      setSuccessMessage('Group directory path saved successfully!');
      setSnackbarOpen(true);
    } catch (err) {
      setError('Failed to save group directory path. ' + (err.message || ''));
      console.error('Error saving group path:', err);
    }
    setIsSavingPath(false);
  };

  const handleCloseSnackbar = (event, reason) => {
    if (reason === 'clickaway') {
      return;
    }
    setSnackbarOpen(false);
  };

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
              Group Directory Path Configuration
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Assign a root directory path on the server for each group. 
              This path will be used for file browsing and operations for users in that group.
              The directory must exist on the server.
            </Typography>
            
            {isLoadingGroups && <CircularProgress size={24} sx={{ mb: 2 }} />}
            
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={5}>
                <FormControl fullWidth variant="outlined" disabled={isLoadingGroups || groups.length === 0}>
                  <InputLabel id="select-group-label">Select Group</InputLabel>
                  <Select
                    labelId="select-group-label"
                    value={selectedGroupId}
                    onChange={handleGroupChange}
                    label="Select Group"
                  >
                    <MenuItem value="">
                      <em>None</em>
                    </MenuItem>
                    {groups.map((group) => (
                      <MenuItem key={group.id} value={group.id}>
                        {group.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12} sm={7}>
                <TextField
                  fullWidth
                  label="Group Directory Path"
                  variant="outlined"
                  value={currentGroupPathInput}
                  onChange={handlePathInputChange}
                  placeholder="e.g., C:\\path\\to\\group\\directory"
                  helperText={selectedGroupId ? "Enter absolute path on the server" : "Select a group first"}
                  disabled={!selectedGroupId || isLoadingPath || isSavingPath}
                />
                {isLoadingPath && <CircularProgress size={20} sx={{ position: 'absolute', right: 15, top: '50%', marginTop: '-10px'}}/>}
              </Grid>

              <Grid item xs={12}>
                <Button 
                  variant="contained" 
                  color="primary" 
                  onClick={handleSaveGroupPath}
                  disabled={!selectedGroupId || !currentGroupPathInput || isSavingPath || isLoadingPath || currentGroupPathInput === initialGroupPath}
                >
                  {isSavingPath ? <CircularProgress size={24} color="inherit" /> : 'Save Path'}
                </Button>
              </Grid>
            </Grid>
            
            {error && (
              <Box mt={2}>
                <Alert severity="error" onClose={() => setError('')}>{error}</Alert>
              </Box>
            )}
          </CardContent>
        </Card>
      </Paper>
      
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" sx={{ width: '100%' }} onClose={handleCloseSnackbar}>
          {successMessage}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default Settings;