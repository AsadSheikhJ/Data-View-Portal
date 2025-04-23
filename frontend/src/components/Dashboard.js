import React, { useState } from 'react';
import { 
  AppBar, Box, Toolbar, Typography, IconButton, Drawer, 
  List, ListItem, ListItemIcon, ListItemText, Divider, 
  Avatar, Menu, MenuItem, Button
} from '@mui/material';
import {
  Menu as MenuIcon,
  Folder as FolderIcon,
  People as PeopleIcon,
  Settings as SettingsIcon,
  AccountCircle,
  ExitToApp as LogoutIcon
} from '@mui/icons-material';
import FileBrowser from './FileBrowser';
import UserManagement from './UserManagement';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const drawerWidth = 240;

const Dashboard = () => {
  const [drawerOpen, setDrawerOpen] = useState(true);
  const [anchorEl, setAnchorEl] = useState(null);
  const [currentSection, setCurrentSection] = useState('files');
  
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  const handleDrawerToggle = () => {
    setDrawerOpen(!drawerOpen);
  };
  
  const handleProfileMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };
  
  const handleProfileMenuClose = () => {
    setAnchorEl(null);
  };
  
  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleSettingsClick = () => {
    navigate('/settings');
  };
  
  const isAdmin = user && user.role === 'admin';
  
  return (
    <Box sx={{ display: 'flex', height: '100vh' }}>
      {/* App Bar */}
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            edge="start"
            onClick={handleDrawerToggle}
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            File Manager
          </Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Typography variant="body1" sx={{ mr: 2 }}>
              {user?.name || 'User'}
            </Typography>
            <IconButton
              color="inherit"
              aria-label="account of current user"
              aria-controls="menu-appbar"
              aria-haspopup="true"
              onClick={handleProfileMenuOpen}
            >
              <Avatar sx={{ width: 32, height: 32, bgcolor: 'secondary.main' }}>
                {(user?.name?.[0] || 'U').toUpperCase()}
              </Avatar>
            </IconButton>
          </Box>
        </Toolbar>
      </AppBar>
      
      {/* User Menu */}
      <Menu
        id="menu-appbar"
        anchorEl={anchorEl}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        keepMounted
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        open={Boolean(anchorEl)}
        onClose={handleProfileMenuClose}
      >
        <MenuItem disabled>
          <Typography variant="body2" color="text.secondary">
            Signed in as {user?.email}
          </Typography>
        </MenuItem>
        <MenuItem disabled>
          <Typography variant="body2" color="text.secondary">
            Role: {user?.role || 'user'}
          </Typography>
        </MenuItem>
        <Divider />
        <MenuItem onClick={handleLogout}>
          <ListItemIcon>
            <LogoutIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Logout</ListItemText>
        </MenuItem>
      </Menu>
      
      {/* Side Drawer */}
      <Drawer
        variant="persistent"
        anchor="left"
        open={drawerOpen}
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
            top: ['48px', '56px', '64px'],
            height: 'auto',
            bottom: 0,
          },
        }}
      >
        <Toolbar />
        <Box sx={{ overflow: 'auto' }}>
          <List>
            <ListItem 
              // Use component prop instead of button
              component="div"
              selected={currentSection === 'files'} 
              onClick={() => setCurrentSection('files')}
              sx={{ cursor: 'pointer' }}
            >
              <ListItemIcon>
                <FolderIcon />
              </ListItemIcon>
              <ListItemText primary="Files" />
            </ListItem>
            
            {isAdmin && (
              <ListItem 
                component="div"
                selected={currentSection === 'users'} 
                onClick={() => setCurrentSection('users')}
                sx={{ cursor: 'pointer' }}
              >
                <ListItemIcon>
                  <PeopleIcon />
                </ListItemIcon>
                <ListItemText primary="Users" />
              </ListItem>
            )}
            
            {isAdmin && (
              <ListItem 
                component="div"
                onClick={handleSettingsClick}
                sx={{ cursor: 'pointer' }}
              >
                <ListItemIcon>
                  <SettingsIcon />
                </ListItemIcon>
                <ListItemText primary="Settings" />
              </ListItem>
            )}
          </List>
        </Box>
      </Drawer>
      
      {/* Main Content */}
      <Box component="main" sx={{ 
        flexGrow: 1, 
        p: 3, 
        marginLeft: drawerOpen ? `${drawerWidth}px` : 0,
        transition: theme => theme.transitions.create('margin', {
          easing: theme.transitions.easing.sharp,
          duration: theme.transitions.duration.leavingScreen,
        }),
      }}>
        <Toolbar />
        
        {currentSection === 'files' && <FileBrowser />}
        
        {currentSection === 'users' && isAdmin && <UserManagement />}
        
        {currentSection === 'settings' && (
          <Box sx={{ p: 3 }}>
            <Typography variant="h4" component="h2" gutterBottom>
              Settings
            </Typography>
            <Typography variant="body1">
              Settings functionality would go here.
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default Dashboard;