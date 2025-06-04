import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Container,
  Paper,
  Typography,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Divider,
  CircularProgress,
  Alert,
  Snackbar
} from '@mui/material';
import {
  Group as GroupIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import groupService from '../../services/groupService';
import GroupDialog from '../../components/groups/GroupDialog'; // Corrected path relative to AdminPanel

const GroupManagementPage = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const navigate = useNavigate();

  const [groups, setGroups] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState(null); // For edit mode later

  const fetchGroups = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const fetchedGroups = await groupService.getAllGroups();
      setGroups(fetchedGroups || []);
    } catch (err) {
      console.error('Failed to fetch groups:', err);
      setError(err.message || 'Failed to fetch groups. Ensure you are logged in as an admin.');
      setGroups([]); // Clear groups on error
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    if (isAdmin) {
      fetchGroups();
    } else {
      setError('You do not have permission to view this page.');
      // navigate('/dashboard'); // Optionally redirect non-admins
    }
  }, [isAdmin, fetchGroups, navigate]);

  const handleOpenCreateDialog = () => {
    setEditingGroup(null);
    setIsDialogOpen(true);
  };

  const handleOpenEditDialog = (group) => {
    setEditingGroup(group);
    setIsDialogOpen(true);
  };
  
  const handleDeleteGroup = async (groupId, groupName) => {
    if (window.confirm(`Are you sure you want to delete the group "${groupName}"? This action cannot be undone.`)) {
      try {
        await groupService.deleteGroup(groupId);
        setSnackbar({ open: true, message: `Group "${groupName}" deleted successfully.`, severity: 'success' });
        fetchGroups(); // Refresh the list
      } catch (err) {
        console.error('Failed to delete group:', err);
        setSnackbar({ open: true, message: `Failed to delete group: ${err.message}`, severity: 'error' });
      }
    }
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setEditingGroup(null);
  };

  const handleDialogSave = async () => { 
    setIsDialogOpen(false); 
    setEditingGroup(null);
    setSnackbar({ open: true, message: `Group ${editingGroup ? 'updated' : 'created'} successfully.`, severity: 'success' });
    fetchGroups(); 
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  if (!isAdmin && !error) { 
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6">Access Denied</Typography>
          <Typography>You do not have permission to manage groups.</Typography>
          <Button variant="outlined" onClick={() => navigate('/dashboard')} sx={{mt: 2}}>Back to Dashboard</Button>
        </Paper>
      </Container>
    );
  }
  
  if (error && !isLoading) { 
    return (
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Alert severity="error">{error}</Alert>
        <Button variant="outlined" onClick={() => navigate('/dashboard')} sx={{mt: 2}}>Back to Dashboard</Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Paper elevation={3} sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h4" gutterBottom>
            Group Management
          </Typography>
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={handleOpenCreateDialog}
            disabled={isLoading} 
          >
            Create New Group
          </Button>
        </Box>
        <Divider sx={{ mb: 2 }} />

        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 3 }}>
            <CircularProgress />
          </Box>
        ) : groups.length === 0 ? (
          <Typography sx={{mt: 2, textAlign: 'center'}}>
            No groups found. Click "Create New Group" to add one.
            {error && <Alert severity="warning" sx={{mt: 1}}>{error}</Alert>} 
          </Typography>
        ) : (
          <List>
            {groups.map((group) => (
              <ListItem 
                key={group.id} 
                secondaryAction={
                  <Box>
                    <IconButton edge="end" aria-label="edit" onClick={() => handleOpenEditDialog(group)} sx={{mr: 1}}>
                      <EditIcon />
                    </IconButton>
                    <IconButton edge="end" aria-label="delete" onClick={() => handleDeleteGroup(group.id, group.name)}>
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                }
                divider
              >
                <ListItemIcon>
                  <GroupIcon />
                </ListItemIcon>
                <ListItemText 
                  primary={group.name} 
                  secondary={group.description || 'No description'} 
                />
              </ListItem>
            ))}
          </List>
        )}
      </Paper>

      <GroupDialog 
        open={isDialogOpen}
        onClose={handleDialogClose}
        onSave={handleDialogSave} 
        groupToEdit={editingGroup}
      />

      <Snackbar open={snackbar.open} autoHideDuration={6000} onClose={handleCloseSnackbar}>
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>

    </Container>
  );
};

export default GroupManagementPage; 