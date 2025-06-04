import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  TextField,
  Button,
  CircularProgress,
  Autocomplete,
  Chip,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Typography,
  Alert
} from '@mui/material';
import groupService from '../../services/groupService';
import { getUsers as getAllUsersAPICall } from '../../services/userService'; // Renamed to avoid confusion

const GroupDialog = ({ open, onClose, onSave, groupToEdit }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedUsersState, setSelectedUsersState] = useState([]); // Stores user objects with their roles
  const [allUsers, setAllUsers] = useState([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [usersError, setUsersError] = useState(null); // Specific error for users list

  const isEditMode = Boolean(groupToEdit && groupToEdit.id);

  // Populate form fields when groupToEdit changes or dialog opens in edit mode
  useEffect(() => {
    if (open && groupToEdit) {
      setName(groupToEdit.name || '');
      setDescription(groupToEdit.description || '');
      // User pre-selection will be handled after allUsers are fetched
    } else if (open && !groupToEdit) {
      // Reset for create mode when dialog opens
      setName('');
      setDescription('');
      setSelectedUsersState([]);
      setError(null);
      setUsersError(null);
    }
  }, [groupToEdit, open]);

  // Fetch all users when the dialog opens
  // And then, if in edit mode, pre-select users for the group
  useEffect(() => {
    if (!open) {
      setAllUsers([]); // Clear users when dialog is not open to refetch next time
      return;
    }

    const loadUsersAndPreselect = async () => {
      setIsLoadingUsers(true);
      setUsersError(null);
      // Initialize fetchedUsers as an empty array for safety
      let fetchedUsersData = []; 
      try {
        // getAllUsersAPICall directly uses API.get, which returns an Axios response object
        const response = await getAllUsersAPICall(); 
        
        // The actual array of users should be in response.data
        if (response && Array.isArray(response.data)) {
          fetchedUsersData = response.data;
          setAllUsers(fetchedUsersData);
        } else {
          // Handle cases where response.data is not an array (e.g., API error, unexpected format)
          console.error('Fetched users data is not an array or response is invalid:', response);
          setAllUsers([]); // Fallback to empty array
          // Consider setting a more specific user error if the structure is wrong
          setUsersError('Failed to load users: data format error.');
        }
      } catch (err) {
        console.error('Failed to fetch users for dialog:', err);
        setUsersError('Failed to load users list. Please check connectivity or try again.');
        setAllUsers([]); // Ensure it's an array on error
        setIsLoadingUsers(false); // Ensure loading state is turned off on error
        return; // Stop if users can't be loaded
      }
      setIsLoadingUsers(false); // Users loaded or loading failed but handled

      // If in edit mode and we have a group and fetched users, pre-select
      // Use fetchedUsersData here which is guaranteed to be an array (possibly empty)
      if (groupToEdit && groupToEdit.users && fetchedUsersData.length > 0) {
        const preselected = groupToEdit.users.map(gu => {
          // Ensure gu.user exists and has an id before finding
          const fullUser = gu.user && gu.user.id !== undefined 
            ? fetchedUsersData.find(u => u.id === gu.user.id) 
            : null;
          return fullUser ? { ...fullUser, role: gu.role || 'viewer' } : null;
        }).filter(Boolean); // filter(Boolean) removes any null entries
        setSelectedUsersState(preselected);
      } else if (!groupToEdit) {
        setSelectedUsersState([]); // Ensure it's empty for create mode
      }
    };

    loadUsersAndPreselect();

  }, [open, groupToEdit]); // Rerun if dialog opens or groupToEdit changes

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!name.trim()) {
      setError('Group name is required.');
      return;
    }
    setIsSaving(true);
    setError(null);

    const groupData = {
      name: name.trim(),
      description: description.trim(),
      users: selectedUsersState.map(user => ({ 
        userId: user.id, 
        role: user.role || 'viewer' 
      })),
      restrictedSubDirectories: groupToEdit?.restrictedSubDirectories || [] 
    };

    try {
      if (isEditMode) {
        await groupService.updateGroup(groupToEdit.id, groupData);
      } else {
        await groupService.createGroup(groupData);
      }
      onSave(); 
      handleClose(); 
    } catch (err) {
      console.error('Failed to save group:', err);
      setError(err.response?.data?.message || err.message || 'Failed to save group.');
    }
    setIsSaving(false);
  };

  const handleClose = () => {
    // Reset general form state, specific user states are reset by open effect
    if (!isEditMode) {
        setName('');
        setDescription('');
        setSelectedUsersState([]);
    }
    setError(null);
    setUsersError(null); // Clear user-specific error on close
    setIsSaving(false);
    // setAllUsers([]); // Clearing here might be too aggressive if dialog is toggled quickly
    onClose(); 
  };

  return (
    <Dialog open={open} onClose={handleClose} fullWidth maxWidth="sm">
      <DialogTitle>{isEditMode ? 'Edit Group' : 'Create New Group'}</DialogTitle>
      <DialogContent>
        {!isEditMode && (
            <DialogContentText sx={{mb: 2}}>
                To create a new group, please provide a name and an optional description. You can assign users to the group.
                The group's main directory path and specific subdirectory restrictions are configured in Settings after creation.
            </DialogContentText>
        )}
        {isEditMode && groupToEdit && (
             <DialogContentText sx={{mb: 2}}>
                Editing group: <strong>{groupToEdit.name}</strong>.
                The group's main directory path and specific subdirectory restrictions are configured in Settings.
            </DialogContentText>
        )}
        <TextField
          autoFocus
          margin="dense"
          id="name"
          label="Group Name"
          type="text"
          fullWidth
          variant="outlined"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          error={!!error && name.trim() === ''}
          helperText={error && name.trim() === '' ? 'Group name is required' : ''}
          sx={{ mb: 2 }}
        />
        <TextField
          margin="dense"
          id="description"
          label="Group Description"
          type="text"
          fullWidth
          multiline
          rows={3}
          variant="outlined"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          sx={{ mb: 2 }}
        />
        <Autocomplete
          multiple
          id="group-users-autocomplete"
          options={allUsers}
          getOptionLabel={(option) => `${option.name} (${option.email})`} // Assumes name and email exist
          value={selectedUsersState} // Use the new state
          onChange={(event, newValue) => {
            setSelectedUsersState(newValue.map(user => ({...user, role: user.role || 'viewer' })));
          }}
          isOptionEqualToValue={(option, value) => option.id === value.id}
          renderInput={(params) => (
            <TextField
              {...params}
              variant="outlined"
              label="Assign Users"
              placeholder={isLoadingUsers ? "Loading users..." : (allUsers.length === 0 ? "No users available" : "Select users")}
              error={!!usersError}
              helperText={usersError}
              InputProps={{
                ...params.InputProps,
                endAdornment: (
                  <React.Fragment>
                    {isLoadingUsers ? <CircularProgress color="inherit" size={20} /> : null}
                    {params.InputProps.endAdornment}
                  </React.Fragment>
                ),
              }}
            />
          )}
          renderTags={(value, getTagProps) =>
            value.map((option, index) => (
              <Chip variant="outlined" label={`${option.name} (Role: ${option.role || 'viewer'})`} {...getTagProps({ index })} />
            ))
          }
          disabled={isLoadingUsers || !!usersError} // Disable if loading or if there was an error loading users
          sx={{ mb: 2 }}
        />
        {/* Simple role assignment for all selected users - might be removed if using per-user roles above */}
        {/* 
        <FormControl fullWidth sx={{mb:2, mt:1}} disabled={selectedUsers.length === 0}>
          <InputLabel id="user-role-select-label">Role for Selected Users</InputLabel>
          <Select
            labelId="user-role-select-label"
            value={ 'viewer' } // This needs to be dynamic if we allow changing role for the batch
            label="Role for Selected Users"
            // onChange={(e) => handleBatchRoleChange(e.target.value)}
          >
            <MenuItem value="viewer">Viewer</MenuItem>
            <MenuItem value="editor">Editor</MenuItem>
            <MenuItem value="admin">Group Admin (future)</MenuItem> 
          </Select>
        </FormControl> 
        */}

        {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
      </DialogContent>
      <DialogActions sx={{p: '16px 24px'}}>
        <Button onClick={handleClose} color="inherit">Cancel</Button>
        <Button onClick={handleSubmit} variant="contained" color="primary" disabled={isSaving || isLoadingUsers}>
          {isSaving ? <CircularProgress size={24} /> : (isEditMode ? 'Save Changes' : 'Create Group')}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default GroupDialog; 