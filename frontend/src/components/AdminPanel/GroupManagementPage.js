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
  Snackbar,
  Avatar
} from '@mui/material';
import {
  Group as GroupIcon,
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  PeopleAlt as PeopleAltIcon
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
    <Container maxWidth="xlg" >
      <Box sx={{ p: { xs: 0, md: 0 }}}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2.5 }}>
          <Typography variant="h5" component="h2" sx={{ fontWeight: 600 }}>
            Groups
          </Typography>
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpenCreateDialog}
            disabled={isLoading} 
            sx={{ fontWeight: 500 }}
          >
            Create New Group
          </Button>
        </Box>

        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 5 }}>
            <CircularProgress />
            <Typography sx={{ ml: 2 }}>Loading groups...</Typography>
          </Box>
        ) : groups.length === 0 ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', py: 6, border: '1px dashed', borderColor: 'divider', borderRadius: 1.5, mt: 2 }}>
            <GroupIcon sx={{ fontSize: 48, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary">No groups found.</Typography>
            <Typography color="text.secondary">Click "Create New Group" to add one.</Typography>
            {error && <Alert severity="warning" sx={{mt: 2, width: 'fit-content'}}>{error}</Alert>} 
          </Box>
        ) : (
          <List sx={{ pt: 0 }}>
            {groups.map((group) => (
              <Paper 
                key={group.id} 
                sx={{ 
                  mb: 1.5, 
                  p: 2, 
                  borderRadius: 1.5, 
                  display: 'flex', 
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  transition: 'box-shadow 0.3s',
                  '&:hover': {
                    boxShadow: (theme) => theme.shadows[2]
                  }
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
                  <Avatar sx={{ bgcolor: 'primary.main', mr: 2, mt: 0.5 }}>
                    <GroupIcon sx={{ color: 'white'}} />
                  </Avatar>
                  <Box>
                    <Typography variant="h6" component="div" sx={{ fontWeight: 500 }}>
                      {group.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      {group.description || 'No description provided.'}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', color: 'text.secondary' }}>
                      <PeopleAltIcon fontSize="small" sx={{ mr: 0.5 }} />
                      <Typography variant="caption">
                        {Array.isArray(group.users) ? group.users.length : 0} member(s)
                      </Typography>
                    </Box>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', ml: 1, mt: -0.5 }}>
                  <IconButton edge="end" aria-label="edit" onClick={() => handleOpenEditDialog(group)} sx={{mr: 0.5}}>
                    <EditIcon />
                  </IconButton>
                  <IconButton edge="end" aria-label="delete" onClick={() => handleDeleteGroup(group.id, group.name)} color="error">
                    <DeleteIcon />
                  </IconButton>
                </Box>
              </Paper>
            ))}
          </List>
        )}
      </Box>

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