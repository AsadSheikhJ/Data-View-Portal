import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  Divider,
  Button,
  TextField,
  Snackbar,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import fileService from '../services/fileService';
import groupService from '../services/groupService';
import { useNavigate } from 'react-router-dom';
import GroupRestrictionsManager from './settings/GroupRestrictionsManager';

const Settings = ({ darkMode, setDarkMode }) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const navigate = useNavigate();

  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'success'
  });

  const [legacyRootDirectoryPath, setLegacyRootDirectoryPath] = useState('');
  const [isLoadingLegacyPath, setIsLoadingLegacyPath] = useState(false);

  const [groups, setGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [currentGroupPathInput, setCurrentGroupPathInput] = useState('');
  const [initialGroupPathForSelected, setInitialGroupPathForSelected] = useState('');

  const [isLoadingGroups, setIsLoadingGroups] = useState(false);
  const [isLoadingSelectedGroupPath, setIsLoadingSelectedGroupPath] = useState(false);
  const [isSavingGroupPath, setIsSavingGroupPath] = useState(false);
  const [groupPathError, setGroupPathError] = useState('');

  // State related to group details and restrictions, passed to or managed by GroupRestrictionsManager
  const [currentGroupDetails, setCurrentGroupDetails] = useState(null); 
  const [isLoadingGroupDetails, setIsLoadingGroupDetails] = useState(false); 
  const [isSavingRestrictions, setIsSavingRestrictions] = useState(false); 
  const [restrictionsError, setRestrictionsError] = useState(''); 

  useEffect(() => {
    if (isAdmin) {
      const loadLegacyDirectoryConfig = async () => {
        setIsLoadingLegacyPath(true);
        try {
          const config = await fileService.getDirectoryConfig();
          if (config.customDirectoryPath) {
            setLegacyRootDirectoryPath(config.customDirectoryPath);
          }
        } catch (configError) {
          console.warn('Error loading legacy directory config:', configError);
        }
        setIsLoadingLegacyPath(false);
      };
      loadLegacyDirectoryConfig();
    }
  }, [isAdmin]);

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  useEffect(() => {
    if (isAdmin) {
      const fetchGroups = async () => {
        setIsLoadingGroups(true);
        try {
          const fetchedGroups = await groupService.getAllGroups();
          setGroups(fetchedGroups || []);
        } catch (err) {
          console.error('Error fetching groups:', err);
          setGroupPathError('Failed to load groups: ' + (err?.message || String(err)));
        }
        setIsLoadingGroups(false);
      };
      fetchGroups();
    }
  }, [isAdmin]);

  const fetchGroupPath = useCallback(async (groupId) => {
    if (!groupId) {
      setCurrentGroupPathInput('');
      setInitialGroupPathForSelected('');
      return;
    }
    setIsLoadingSelectedGroupPath(true);
    setGroupPathError('');
    try {
      const data = await groupService.getGroupDirectoryPath(groupId);
      setCurrentGroupPathInput(data.path || '');
      setInitialGroupPathForSelected(data.path || '');
    } catch (err) {
      const isNotFoundError = err.message?.includes('not configured') || err.status === 404 || err.response?.status === 404;
      if (isNotFoundError) {
        setCurrentGroupPathInput('');
        setInitialGroupPathForSelected('');
      } else {
        console.error(`Error fetching path for group ${groupId}:`, err);
        setGroupPathError('Failed to load path for selected group: ' + (err?.message || String(err)));
        setCurrentGroupPathInput(''); // Reset on error
        setInitialGroupPathForSelected('');
      }
    }
    setIsLoadingSelectedGroupPath(false);
  }, []);

  useEffect(() => {
    if (selectedGroupId && isAdmin) {
      fetchGroupPath(selectedGroupId); 

      const fetchFullGroupDetails = async () => {
        setIsLoadingGroupDetails(true);
        setRestrictionsError(''); // Clear previous restriction errors
        setCurrentGroupDetails(null); 
        try {
          const details = await groupService.getGroupById(selectedGroupId);
          setCurrentGroupDetails(details);
        } catch (err) {
          console.error(`Error fetching full details for group ${selectedGroupId}:`, err);
          // This error state will be primarily used by GroupRestrictionsManager
          setRestrictionsError('Failed to load full group details: ' + (err?.message || String(err)));
        }
        setIsLoadingGroupDetails(false);
      };
      fetchFullGroupDetails();

    } else {
      setCurrentGroupPathInput('');
      setInitialGroupPathForSelected('');
      setCurrentGroupDetails(null); 
      setRestrictionsError(''); 
    }
  }, [selectedGroupId, isAdmin, fetchGroupPath]);

  const handleGroupSelectChange = (event) => {
    setSelectedGroupId(event.target.value);
    setRestrictionsError(''); // Clear restriction-related errors when group changes
  };

  const handleCurrentGroupPathInputChange = (event) => {
    setCurrentGroupPathInput(event.target.value);
  };

  const handleSaveSelectedGroupPath = async () => {
    if (!selectedGroupId || !currentGroupPathInput.trim()) {
      setGroupPathError('Please select a group and enter a valid directory path.');
      return;
    }
    setIsSavingGroupPath(true);
    setGroupPathError('');
    try {
      await groupService.setGroupDirectoryPath(selectedGroupId, currentGroupPathInput.trim());
      setInitialGroupPathForSelected(currentGroupPathInput.trim());
      setSnackbar({ open: true, message: 'Group directory path saved successfully!', severity: 'success' });
    } catch (err) {
      console.error('Error saving group path:', err);
      const errorMessage = typeof err === 'string' ? err : (err.message || 'An unknown error occurred.');
      setGroupPathError('Failed to save group path: ' + errorMessage);
    }
    setIsSavingGroupPath(false);
  };

  const handleSaveRestrictionsCallback = async (groupId, restrictionsToSave) => {
    if (!groupId) {
      // This case should ideally be handled within GroupRestrictionsManager before calling this
      console.error('handleSaveRestrictionsCallback called without groupId');
      throw new Error('Group ID is missing.'); 
    }
    setIsSavingRestrictions(true);
    // setRestrictionsError(''); // Error display is primarily managed by the child component
    try {
      const updatedGroup = await groupService.updateGroupRestrictedSubdirectories(groupId, restrictionsToSave);
      setCurrentGroupDetails(updatedGroup); // Refresh group details in parent state
      setSnackbar({ open: true, message: 'Restricted subdirectories updated successfully!', severity: 'success' });
      setIsSavingRestrictions(false);
      return updatedGroup; // Return updated group to child for its own state update
    } catch (err) {
      console.error('Error saving restricted subdirectories (Settings.js callback):', err);
      setIsSavingRestrictions(false);
      // Propagate a new error object or a structured error to the child
      const errorMessage = err.response?.data?.message || err.message || 'An unknown error occurred during save.';
      throw new Error(errorMessage);
    }
  };

  const handleSetLegacyRootDirectory = async () => {
    if (!legacyRootDirectoryPath.trim()) {
      setSnackbar({
        open: true,
        message: 'Please enter a valid directory path for the legacy setting.',
        severity: 'error'
      });
      return;
    }
    setIsLoadingLegacyPath(true);
    try {
      await fileService.updateDirectoryConfig(legacyRootDirectoryPath);
      setSnackbar({
        open: true,
        message: 'Legacy global root directory updated successfully. This setting is deprecated.',
        severity: 'info'
      });
    } catch (error) {
      console.error('Error setting legacy root directory:', error.message);
      setSnackbar({
        open: true,
        message: `Failed to set legacy root directory: ${error.message}`,
        severity: 'error'
      });
    } finally {
      setIsLoadingLegacyPath(false);
    }
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={3} sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom sx={{ mb: 2 }}>
          Settings
        </Typography>
        <Divider sx={{ mb: 3 }} />

        {isAdmin && (
          <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom>
              Group Directory Configuration
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Assign a root directory path for each group. This path is essential for file operations and for defining restricted subdirectories.
              Ensure the main directory exists on the server. Restrictions can only be managed if a path is set.
            </Typography>

            {isLoadingGroups ? (
              <CircularProgress sx={{mb:2}}/>
            ) : (
              <FormControl fullWidth sx={{ mb: 2 }} disabled={groups.length === 0 && !isLoadingGroups}>
                <InputLabel id="group-select-label">Select Group</InputLabel>
                <Select
                  labelId="group-select-label"
                  value={selectedGroupId}
                  label="Select Group"
                  onChange={handleGroupSelectChange}
                >
                  <MenuItem value=""><em>None</em></MenuItem>
                  {groups.map((group) => (
                    <MenuItem key={group.id} value={group.id}>{group.name}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            <TextField
              fullWidth
              label="Directory Path for Selected Group"
              variant="outlined"
              value={currentGroupPathInput}
              onChange={handleCurrentGroupPathInputChange}
              placeholder={selectedGroupId ? "e.g., C:\\paths\\group_dir" : "Select a group to set its path"}
              disabled={!selectedGroupId || isLoadingSelectedGroupPath || isSavingGroupPath}
              sx={{ mb: 2 }}
              InputProps={{ 
                endAdornment: isLoadingSelectedGroupPath ? <CircularProgress size={20} /> : null 
              }}
            />
            <Button
              variant="contained"
              color="primary"
              onClick={handleSaveSelectedGroupPath}
              disabled={!selectedGroupId || !currentGroupPathInput.trim() || isSavingGroupPath || isLoadingSelectedGroupPath || currentGroupPathInput === initialGroupPathForSelected}
            >
              {isSavingGroupPath ? <CircularProgress size={24} color="inherit"/> : 'Save Group Path'}
            </Button>
            {groupPathError && (
              <Alert severity="error" sx={{ mt: 2 }} onClose={() => setGroupPathError('')}>
                {groupPathError}
              </Alert>
            )}

            {/* Group Restrictions Manager integration */}
            {selectedGroupId && currentGroupPathInput && (
              <>
                <Divider sx={{ my: 3 }} />
                <GroupRestrictionsManager 
                  selectedGroupId={selectedGroupId}
                  currentGroupDetails={currentGroupDetails} 
                  currentGroupPathInput={currentGroupPathInput} 
                  isLoadingGroupDetails={isLoadingGroupDetails}
                  onSaveRestrictions={handleSaveRestrictionsCallback} 
                  isSavingRestrictions={isSavingRestrictions} 
                  restrictionsError={restrictionsError}  // Pass the error state managed by Settings.js
                  setRestrictionsError={setRestrictionsError} // Pass the setter
                />
              </>
            )}
            {selectedGroupId && !currentGroupPathInput && !isLoadingSelectedGroupPath && (
                 <Alert severity="info" sx={{ mt: 2 }}>
                    Please set and save a directory path for this group to manage its subdirectory restrictions.
                </Alert>
            )}

          </Paper>
        )}

        {/* Legacy Global Root Directory (Deprecated) */}
        {isAdmin && (
          <Paper sx={{ p: 3, mb: 3, opacity: 0.6, border: '1px dashed grey' }}>
            <Typography variant="h6" gutterBottom>
              Legacy Global Root Directory (Deprecated)
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              This setting configures a single global root directory. It is being replaced by per-group directory paths above.
              Current global path: <code>{isLoadingLegacyPath ? <CircularProgress size={14}/> : legacyRootDirectoryPath || 'Not Set'}</code>
            </Typography>
            <Alert severity="warning" sx={{ mt: 2, mb: 2 }}>
              <Typography variant="body2">
              This global setting is deprecated. Please use the Group Directory Path Configuration above.
              </Typography>
            </Alert>
            <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mt: 1, mb:1}}>
              Note: Setting a new root directory may sometimes require restarting the server to take effect. If not working.
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <TextField
                label="Global Root Directory Path (Legacy)"
                variant="outlined"
                size="small"
                value={legacyRootDirectoryPath}
                onChange={(e) => setLegacyRootDirectoryPath(e.target.value)}
                placeholder="DriveLetter:\path\to\directory"
                sx={{ mr: 2, flexGrow: 1 }}
                disabled={isLoadingLegacyPath}
              />
              <Button
                variant="contained"
                onClick={handleSetLegacyRootDirectory}
                disabled={true}
                title="This global setting is deprecated. Please use Group Directory Paths."
              >
                Update Legacy Global Path
              </Button>
            </Box>
          </Paper>
        )}

        <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-start' }}>
          <Button
            variant="outlined"
            color="primary"
            onClick={() => navigate('/dashboard')}
          >
            Back to Dashboard
          </Button>
        </Box>
      </Paper>

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
    </Container>
  );
};

export default Settings;
