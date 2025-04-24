import React, { useState, useEffect } from 'react';
import { 
  AppBar, Box, Toolbar, Typography, IconButton, Drawer, 
  List, ListItem, ListItemIcon, ListItemText, Divider, 
  Avatar, Menu, MenuItem, useMediaQuery, useTheme,
  Paper, Tooltip, Fade, Badge, Chip
} from '@mui/material';
import {
  Menu as MenuIcon,
  Folder as FolderIcon,
  People as PeopleIcon,
  Settings as SettingsIcon,
  ExitToApp as LogoutIcon,
  Brightness4 as DarkModeIcon,
  Brightness7 as LightModeIcon,
  Dashboard as DashboardIcon
} from '@mui/icons-material';
import FileBrowser from './FileBrowser';
import UserManagement from './UserManagement';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const drawerWidth = 230;

const Dashboard = ({ colorMode }) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [drawerOpen, setDrawerOpen] = useState(!isMobile);
  const [anchorEl, setAnchorEl] = useState(null);
  const [currentSection, setCurrentSection] = useState('files');
  
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { mode, toggleColorMode } = colorMode || { mode: 'light', toggleColorMode: () => {} };

  // Close drawer automatically on mobile
  useEffect(() => {
    if (isMobile) {
      setDrawerOpen(false);
    }
  }, [isMobile]);
  
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
  
  // Get user's first name for display
  const firstName = user?.name?.split(' ')[0] || 'User';
  
  // Get user's initials for avatar
  const getInitials = () => {
    if (!user?.name) return 'U';
    return user.name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
  };
  
  // Get greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <Box sx={{ 
      display: 'flex', 
      height: '100vh', 
      overflow: 'hidden',
      bgcolor: theme.palette.background.default
    }}>
      {/* App Bar */}
      <AppBar 
        position="fixed" 
        elevation={0}
        sx={{ 
          zIndex: (theme) => theme.zIndex.drawer + 1,
          width: '100%',
          backgroundImage: mode === 'dark' ? 'none' : 
            'linear-gradient(90deg, rgba(37,99,235,1) 0%, rgba(79,70,229,1) 100%)',
        }}
      >
        <Toolbar variant="dense" sx={{ justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <IconButton
              color="inherit"
              aria-label="open drawer"
              edge="start"
              onClick={handleDrawerToggle}
              sx={{ mr: 1 }}
              size="small"
            >
              <MenuIcon />
            </IconButton>
            <Typography variant="h6" noWrap component="div" sx={{ 
              fontSize: { xs: '1rem', sm: '1.25rem' },
              fontWeight: 600,
              letterSpacing: '-0.025em'
            }}>
              File Manager
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {/* Theme Toggle */}
            <Tooltip title={`Switch to ${mode === 'dark' ? 'light' : 'dark'} mode`}>
              <IconButton color="inherit" onClick={toggleColorMode} size="small">
                {mode === 'dark' ? <LightModeIcon /> : <DarkModeIcon />}
              </IconButton>
            </Tooltip>

            {/* User Info */}
            <Box sx={{ 
              display: 'flex', 
              alignItems: 'center',
              borderRadius: 2,
              bgcolor: 'rgba(255,255,255,0.15)',
              px: 1,
              py: 0.5,
              '&:hover': {
                bgcolor: 'rgba(255,255,255,0.2)',
                cursor: 'pointer'
              }
            }} onClick={handleProfileMenuOpen}>
              <Typography variant="body2" sx={{ 
                mr: 1, 
                display: { xs: 'none', sm: 'block' },
                fontWeight: 500
              }}>
                {firstName}
              </Typography>
              <Avatar 
                sx={{ 
                  width: 28, 
                  height: 28, 
                  bgcolor: theme.palette.secondary.main,
                  fontSize: '0.875rem',
                  fontWeight: 600
                }}
              >
                {getInitials()}
              </Avatar>
            </Box>
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
        TransitionComponent={Fade}
        elevation={2}
        sx={{ mt: 1 }}
      >
        <Box sx={{ px: 2, py: 1 }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
            {user?.name || 'User'}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {user?.email}
          </Typography>
          <Chip
            size="small"
            label={user?.role === 'admin' ? 'Administrator' : 'Regular User'}
            color={user?.role === 'admin' ? 'primary' : 'default'}
            sx={{ mb: 1 }}
          />
        </Box>
        <Divider />
        {/* <MenuItem onClick={handleSettingsClick}>
          <ListItemIcon>
            <SettingsIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Settings</ListItemText>
        </MenuItem> */}
        <MenuItem onClick={handleLogout}>
          <ListItemIcon>
            <LogoutIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText primary="Logout" sx={{ color: 'error.main' }} />
        </MenuItem>
      </Menu>
      
      {/* Side Drawer */}
      <Drawer
        variant={isMobile ? "temporary" : "persistent"}
        anchor="left"
        open={drawerOpen}
        onClose={isMobile ? handleDrawerToggle : undefined}
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
            top: ['48px', '48px', '56px'],
            height: 'auto',
            bottom: 0,
            borderRight: mode === 'dark' 
              ? '1px solid rgba(255, 255, 255, 0.12)' 
              : '1px solid rgba(0, 0, 0, 0.06)',
          },
        }}
      >
        <Box sx={{ overflow: 'auto' }}>
          <Box sx={{ p: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ 
              fontWeight: 500,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              fontSize: '0.75rem'
            }}>
              Navigation
            </Typography>
          </Box>
          
          <List dense>
            <ListItem 
              component="div"
              selected={currentSection === 'files'} 
              onClick={() => {
                setCurrentSection('files');
                if (isMobile) setDrawerOpen(false);
              }}
              sx={{ 
                cursor: 'pointer',
                mx: 1,
                mb: 0.5,
                ml: 0,
              }}
            >
              <ListItemIcon>
                <FolderIcon color={currentSection === 'files' ? 'primary' : 'inherit'} />
              </ListItemIcon>
              <ListItemText 
                primary="Files" 
                primaryTypographyProps={{ 
                  fontWeight: currentSection === 'files' ? 600 : 400
                }} 
              />
            </ListItem>
            
            {isAdmin && (
              <ListItem 
                component="div"
                selected={currentSection === 'users'} 
                onClick={() => {
                  setCurrentSection('users');
                  if (isMobile) setDrawerOpen(false);
                }}
                sx={{ 
                  cursor: 'pointer',
                  mx: 1,
                  mb: 0.5,
                  ml: 0,
                }}
              >
                <ListItemIcon>
                  <PeopleIcon color={currentSection === 'users' ? 'primary' : 'inherit'} />
                </ListItemIcon>
                <ListItemText 
                  primary="Users" 
                  primaryTypographyProps={{ 
                    fontWeight: currentSection === 'users' ? 600 : 400
                  }} 
                />
              </ListItem>
            )}
          </List>
          
          <Divider sx={{ my: 1 }} />
          
          <Box sx={{ p: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ 
              fontWeight: 500,
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              fontSize: '0.75rem'
            }}>
              Settings
            </Typography>
          </Box>
          
          <List dense>
            <ListItem 
              component="div"
              onClick={() => {
                handleSettingsClick();
                if (isMobile) setDrawerOpen(false);
              }}
              sx={{ 
                cursor: 'pointer',
                mx: 1,
                mb: 0.5,
                ml: 0,
              }}
            >
              <ListItemIcon>
                <SettingsIcon />
              </ListItemIcon>
              <ListItemText primary="Settings" />
            </ListItem>
          </List>
        </Box>
      </Drawer>
      
      {/* Main Content */}
      <Box component="main" sx={{ 
        flexGrow: 1,
        p: { xs: 0.5, sm: 1 },
        paddingTop: { xs: '48px', sm: '48px', md: '56px' },
        width: {
          xs: '100%', 
          sm: drawerOpen ? `calc(100% - ${drawerWidth}px)` : '100%' 
        },
        marginLeft: {
          xs: 0,
          sm: drawerOpen ? 2 : `-${drawerWidth-4}px`
        },
        transition: theme => theme.transitions.create(['margin', 'width'], {
          easing: theme.transitions.easing.sharp,
          duration: theme.transitions.duration.leavingScreen,
        }),
        overflow: 'auto',
        height: '100vh'
      }}>
        {/* Welcome header */}
        <Paper 
          elevation={0} 
          sx={{ 
            mt: 2,
            p: 2, 
            mb: 2, 
            borderRadius: 2,
            background: mode === 'dark' 
              ? 'linear-gradient(90deg, rgba(30,30,30,1) 0%, rgba(40,40,40,1) 100%)' 
              : 'linear-gradient(90deg, rgba(243,244,246,1) 0%, rgba(249,250,251,1) 100%)',
            border: mode === 'dark' 
              ? '1px solid rgba(255, 255, 255, 0.1)' 
              : '1px solid rgba(0, 0, 0, 0.06)',
          }}
        >
          <Typography variant="h5" sx={{ fontWeight: 600, color: theme.palette.text.primary, }}>
            {getGreeting()}, {firstName}!
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {currentSection === 'files' ? 'Browse and manage your files' : 'Manage user accounts and permissions'}
          </Typography>
        </Paper>

        {currentSection === 'files' && <FileBrowser />}
        
        {currentSection === 'users' && isAdmin && <UserManagement />}
        
        {currentSection === 'settings' && (
          <Box sx={{ p: { xs: 1, sm: 2 } }}>
            <Typography variant="h5" component="h2" gutterBottom>
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