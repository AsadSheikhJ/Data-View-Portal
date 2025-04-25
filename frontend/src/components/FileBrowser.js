import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Paper, List, ListItem, ListItemIcon, ListItemText,
  IconButton, Button, Divider, TextField, Dialog, DialogTitle,
  DialogContent, DialogActions, Menu, MenuItem, CircularProgress,
  Breadcrumbs, Link, Tooltip, Snackbar, Alert
} from '@mui/material';
import {
  Folder as FolderIcon,
  Description as FileIcon,
  CloudUpload as UploadIcon,
  Delete as DeleteIcon,
  GetApp as DownloadIcon,
  CreateNewFolder as NewFolderIcon,
  MoreVert as MoreIcon,
  NavigateNext as NavigateNextIcon,
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  Archive as ArchiveIcon
} from '@mui/icons-material';
import fileService from '../services/fileService';
import { useAuth } from '../contexts/AuthContext';

const FileBrowser = () => {
  const [currentPath, setCurrentPath] = useState('');
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [newFolderDialogOpen, setNewFolderDialogOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [contextMenu, setContextMenu] = useState(null);
  const [fileToUpload, setFileToUpload] = useState(null);
  const [snackbar, setSnackbar] = useState({
    open: false,
    message: '',
    severity: 'info'
  });
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [itemToRename, setItemToRename] = useState(null);
  const [newName, setNewName] = useState('');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null);
  const [actionMenuAnchor, setActionMenuAnchor] = useState(null);
  const [selectedItem, setSelectedItem] = useState(null);

  const { user } = useAuth();
  // Safely access permissions with default values if user or permissions is undefined
  const canEdit = user?.permissions?.edit || false;
  const canDownload = user?.permissions?.download || false;

  // Define loadFiles as a callback to avoid recreation on each render
  const loadFiles = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fileService.listFiles(currentPath);
      
      // Ensure data is an array
      const filesArray = Array.isArray(data) ? data : [];
      console.log(`Loaded ${filesArray.length} files/directories`);
      
      // Sort: directories first, then files
      const sortedFiles = filesArray.sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        return a.name.localeCompare(b.name);
      });
      
      setFiles(sortedFiles);
    } catch (err) {
      console.error('Error loading files:', err);
      setError('Failed to load files. Please try again.');
      setFiles([]);
    } finally {
      setLoading(false);
    }
  }, [currentPath]);

  // Load files when path changes
  useEffect(() => {
    loadFiles();
  }, [loadFiles]);

  const handleFileClick = (file) => {
    if (file.isDirectory) {
      setCurrentPath(file.path);
    } else {
      fileService.downloadFile(file.path);
    }
  };

  const handleContextMenu = (event, file) => {
    event.preventDefault();
    setContextMenu({
      mouseX: event.clientX - 2,
      mouseY: event.clientY - 4,
      file
    });
  };

  const handleCloseContextMenu = () => {
    setContextMenu(null);
  };

  const handleUploadClick = () => {
    setUploadDialogOpen(true);
  };

  const handleUploadClose = () => {
    setUploadDialogOpen(false);
  };

  const handleFileInputChange = (event) => {
    setFileToUpload(event.target.files[0]);
  };

  const handleUploadFile = async () => {
    if (!fileToUpload) return;

    try {
      setLoading(true);
      await fileService.uploadFile(fileToUpload, currentPath);
      setUploadDialogOpen(false);
      loadFiles(); // Now loadFiles is defined
      setSnackbar({
        open: true,
        message: 'File uploaded successfully',
        severity: 'success'
      });
    } catch (err) {
      setError('Failed to upload file: ' + (err.message || 'Unknown error'));
      setSnackbar({
        open: true,
        message: 'File upload failed',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleNewFolderClick = () => {
    setNewFolderDialogOpen(true);
  };

  const handleNewFolderClose = () => {
    setNewFolderDialogOpen(false);
  };

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;

    try {
      setLoading(true);
      await fileService.createDirectory(currentPath, newFolderName);
      setNewFolderDialogOpen(false);
      setNewFolderName('');
      loadFiles(); // Now loadFiles is defined
      setSnackbar({
        open: true,
        message: 'Folder created successfully',
        severity: 'success'
      });
    } catch (err) {
      setError('Failed to create folder: ' + (err.message || 'Unknown error'));
      setSnackbar({
        open: true,
        message: 'Failed to create folder',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadFile = async (file) => {
    try {
      await fileService.downloadFile(file.path);
    } catch (err) {
      setError('Failed to download file: ' + (err.message || 'Unknown error'));
      setSnackbar({
        open: true,
        message: 'File download failed',
        severity: 'error'
      });
    }
  };

  const handleDeleteFile = async (file) => {
    try {
      setLoading(true);
      await fileService.deleteItem(file.path);
      loadFiles(); // Now loadFiles is defined
      setSnackbar({
        open: true,
        message: 'Item deleted successfully',
        severity: 'success'
      });
    } catch (err) {
      setError('Failed to delete: ' + (err.message || 'Unknown error'));
      setSnackbar({
        open: true,
        message: 'Delete operation failed',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleNavigateBack = () => {
    if (!currentPath) return;

    const normalizedPath = currentPath.replace(/\\/g, '/');
    const pathParts = normalizedPath.split('/').filter(part => part.length > 0);

    if (pathParts.length === 0) {
      setCurrentPath('');
    } else {
      pathParts.pop();
      setCurrentPath(pathParts.join('/'));
    }
  };

  const handleNavigateToBreadcrumb = (index) => {
    const normalizedPath = currentPath.replace(/\\/g, '/');
    const pathParts = normalizedPath.split('/').filter(part => part.length > 0);
    const newPath = pathParts.slice(0, index + 1).join('/');
    setCurrentPath(newPath);
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const handleRenameClick = (file, event) => {
    if (event) {
      event.stopPropagation();
    }
    setItemToRename(file);
    setNewName(file.name);
    setRenameDialogOpen(true);
  };

  const handleRenameClose = () => {
    setRenameDialogOpen(false);
    setItemToRename(null);
    setNewName('');
  };

  const handleRename = async () => {
    if (!itemToRename || !newName.trim()) return;
    
    try {
      setLoading(true);
      await fileService.renameItem(itemToRename.path, newName);
      loadFiles();
      setRenameDialogOpen(false);
      setSnackbar({
        open: true,
        message: 'Item renamed successfully',
        severity: 'success'
      });
    } catch (err) {
      setError(`Failed to rename: ${err.message || 'Unknown error'}`);
      setSnackbar({
        open: true,
        message: 'Failed to rename item',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadFolder = async (folder, event) => {
    if (event) {
      event.stopPropagation();
    }
    
    try {
      setLoading(true);
      await fileService.downloadFolder(folder.path);
      setSnackbar({
        open: true,
        message: 'Folder download started',
        severity: 'success'
      });
    } catch (err) {
      setError(`Failed to download folder: ${err.message || 'Unknown error'}`);
      setSnackbar({
        open: true,
        message: 'Failed to download folder',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle action menu open
  const handleActionMenuOpen = (file, event) => {
    event.stopPropagation();
    setSelectedItem(file);
    setActionMenuAnchor(event.currentTarget);
  };

  // Handle action menu close
  const handleActionMenuClose = () => {
    setActionMenuAnchor(null);
  };

  // Handle delete confirmation open
  const handleDeleteClick = (file) => {
    handleActionMenuClose();
    setItemToDelete(file);
    setDeleteConfirmOpen(true);
  };

  // Handle delete confirmation close
  const handleDeleteConfirmClose = () => {
    setDeleteConfirmOpen(false);
    setItemToDelete(null);
  };

  // Handle delete confirmation
  const handleDeleteConfirm = async () => {
    if (!itemToDelete) return;

    try {
      setLoading(true);
      await fileService.deleteItem(itemToDelete.path);
      loadFiles();
      setDeleteConfirmOpen(false);
      setItemToDelete(null);
      setSnackbar({
        open: true,
        message: 'Item deleted successfully',
        severity: 'success'
      });
    } catch (err) {
      setError(`Failed to delete: ${err.message || 'Unknown error'}`);
      setSnackbar({
        open: true,
        message: 'Delete operation failed',
        severity: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const renderBreadcrumbs = () => {
    const normalizedPath = currentPath.replace(/\\/g, '/');
    const paths = normalizedPath ? normalizedPath.split('/') : [];

    return (
      <Breadcrumbs aria-label="breadcrumb">
        <Link
          component="button"
          underline="hover"
          color="inherit"
          onClick={() => setCurrentPath('')}
        >
          Home
        </Link>
        {paths.map((item, index) => (
          <Link
            key={index}
            component="button"
            underline="hover"
            color="inherit"
            onClick={() => handleNavigateToBreadcrumb(index)}
          >
            {item}
          </Link>
        ))}
      </Breadcrumbs>
    );
  };

  return (
    <Box>
      <Paper 
        elevation={1} 
        sx={{ 
          p: { xs: 1, sm: 1.5 }, 
          mb: 0.5,
          borderRadius: 2,
          overflow: 'hidden'
        }}
      >
        {/* File browser header with improved styling */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          mb: { xs: 1, sm: 1.5 },
          flexWrap: 'wrap',
          gap: 1
        }}>
          <Typography 
            variant="h6" 
            sx={{ 
              fontSize: { xs: '1rem', sm: '1.1rem' },
              fontWeight: 600,
              color: theme => theme.palette.text.primary
            }}
          >
            Files
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 1 }}>
            {canEdit && (
              <>
                <Button
                  startIcon={<NewFolderIcon />}
                  variant="outlined" 
                  onClick={handleNewFolderClick}
                  size="small"
                  sx={{ 
                    borderRadius: 2,
                    textTransform: 'none',
                    fontWeight: 500
                  }}
                >
                  New Folder
                </Button>
                <Button
                  startIcon={<UploadIcon />}
                  variant="contained"
                  onClick={handleUploadClick}
                  size="small"
                  sx={{ 
                    borderRadius: 2,
                    textTransform: 'none',
                    fontWeight: 500
                  }}
                >
                  Upload
                </Button>
              </>
            )}
          </Box>
        </Box>

        {/* Breadcrumbs navigation with improved styling */}
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          mb: 1.5,
          bgcolor: theme => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
          borderRadius: 2,
          p: 1,
          overflowX: 'auto'
        }}>
          {currentPath && (
            <Tooltip title="Go back">
              <IconButton 
                onClick={handleNavigateBack} 
                size="small" 
                sx={{ 
                  mr: 0.5, 
                  bgcolor: theme => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
                  '&:hover': {
                    bgcolor: theme => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)', 
                  }
                }}
              >
                <ArrowBackIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          <Breadcrumbs 
            separator={<NavigateNextIcon fontSize="small" sx={{ color: 'text.secondary' }} />}
            aria-label="breadcrumb"
            sx={{ 
              flexWrap: 'nowrap', 
              whiteSpace: 'nowrap',
              '.MuiBreadcrumbs-ol': {
                flexWrap: 'nowrap'
              },
              '.MuiBreadcrumbs-li': {
                display: 'flex'
              }
            }}
          >
            {renderBreadcrumbs()}
          </Breadcrumbs>
        </Box>
        
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
            <CircularProgress size={30} />
          </Box>
        ) : error ? (
          <Box 
            sx={{ 
              my: 2, 
              p: 2, 
              borderRadius: 2, 
              bgcolor: theme => theme.palette.mode === 'dark' ? 'rgba(244, 67, 54, 0.1)' : '#ffebee',
              border: '1px solid',
              borderColor: theme => theme.palette.mode === 'dark' ? 'rgba(244, 67, 54, 0.3)' : '#ffcdd2',
            }}
          >
            <Typography color="error.main" variant="body2" sx={{ fontWeight: 500 }}>
              {error}
            </Typography>
          </Box>
        ) : (
          <List 
            sx={{ 
              pt: 0.5, 
              pb: 0.5,
              borderRadius: 1,
              bgcolor: theme => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.01)',
            }}
            dense
          >
            {/* Ensure files is an array and check its length safely */}
            {Array.isArray(files) && files.length > 0 ? (
              files.map((file) => (
                <ListItem
                  key={file.path || Math.random()}
                  component="div"
                  sx={{ 
                    cursor: 'pointer',
                    py: 0.75,
                    px: 1,
                    borderRadius: 1,
                    mb: 0.5,
                    bgcolor: 'background.paper',
                    '&:hover': {
                      bgcolor: theme => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
                    },
                    transition: 'background-color 0.2s',
                    border: '1px solid',
                    borderColor: theme => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)',
                  }}
                  onClick={() => handleFileClick(file)}
                  onContextMenu={(e) => handleContextMenu(e, file)}
                >
                  <ListItemIcon sx={{ minWidth: { xs: 36, sm: 42 } }}>
                    {file.isDirectory ? 
                      <FolderIcon color="primary" fontSize="small" /> : 
                      <FileIcon fontSize="small" sx={{ color: theme => theme.palette.mode === 'dark' ? '#aaa' : '#666' }} />
                    }
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Typography 
                        variant="body2" 
                        component="div" 
                        sx={{ 
                          fontWeight: file.isDirectory ? 600 : 400,
                          color: file.isDirectory ? 'primary.main' : 'text.primary',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {file.name}
                      </Typography>
                    }
                    secondary={
                      <Typography 
                        variant="caption" 
                        component="div" 
                        sx={{ 
                          fontSize: '0.75rem',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          color: 'text.secondary'
                        }}
                      >
                        {file.isDirectory 
                          ? `${file.modifiedAt ? new Date(file.modifiedAt).toLocaleString() : ''}` 
                          : `${fileService.formatFileSize(file.size)} • ${file.modifiedAt ? new Date(file.modifiedAt).toLocaleString() : ''}`
                        }
                      </Typography>
                    }
                  />
                  <Box>
                    {canEdit && (
                      <IconButton 
                        onClick={(e) => handleActionMenuOpen(file, e)}
                        size="small"
                        sx={{ 
                          ml: 1,
                          color: 'text.secondary',
                          '&:hover': {
                            color: 'primary.main',
                            bgcolor: theme => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
                          }
                        }}
                      >
                        <MoreIcon fontSize="small" />
                      </IconButton>
                    )}
                  </Box>
                </ListItem>
              ))
            ) : (
              <Box 
                sx={{ 
                  p: 3, 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 2,
                  bgcolor: theme => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.02)',
                  border: '1px dashed',
                  borderColor: theme => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
                }}
              >
                <FolderIcon sx={{ fontSize: '2.5rem', opacity: 0.5, mb: 1 }} />
                <Typography variant="body2" sx={{ opacity: 0.7, fontWeight: 500 }}>
                  This folder is empty
                </Typography>
              </Box>
            )}
          </List>
        )}
      </Paper>
      
      {/* Action Menu (3-dot menu) with improved styling */}
      <Menu
        anchorEl={actionMenuAnchor}
        open={Boolean(actionMenuAnchor)}
        onClose={handleActionMenuClose}
        elevation={2}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        sx={{ 
          '& .MuiPaper-root': {
            borderRadius: 2,
            minWidth: 180,
          }
        }}
      >
        {/* Rename option for all items */}
        <MenuItem onClick={() => handleRenameClick(selectedItem)} sx={{ borderRadius: 1 }}>
          <ListItemIcon>
            <EditIcon fontSize="small" color="primary" />
          </ListItemIcon>
          <ListItemText primary="Rename" />
        </MenuItem>
        
        {/* Download option for files */}
        {selectedItem && !selectedItem.isDirectory && canDownload && (
          <MenuItem 
            onClick={() => {
              handleActionMenuClose();
              handleDownloadFile(selectedItem);
            }}
            sx={{ borderRadius: 1 }}
          >
            <ListItemIcon>
              <DownloadIcon fontSize="small" color="info" />
            </ListItemIcon>
            <ListItemText primary="Download" />
          </MenuItem>
        )}
        
        {/* Download as ZIP option for folders */}
        {selectedItem && selectedItem.isDirectory && canDownload && (
          <MenuItem 
            onClick={() => handleDownloadFolder(selectedItem)}
            sx={{ borderRadius: 1 }}
          >
            <ListItemIcon>
              <ArchiveIcon fontSize="small" color="info" />
            </ListItemIcon>
            <ListItemText primary="Download as ZIP" />
          </MenuItem>
        )}
        
        <Divider sx={{ my: 0.5 }} />
        
        {/* Delete option for all items */}
        {canEdit && (
          <MenuItem 
            onClick={() => handleDeleteClick(selectedItem)}
            sx={{ borderRadius: 1 }}
          >
            <ListItemIcon>
              <DeleteIcon fontSize="small" color="error" />
            </ListItemIcon>
            <ListItemText primary="Delete" sx={{ color: 'error.main' }} />
          </MenuItem>
        )}
      </Menu>
      
      {/* Context Menu with improved styling */}
      <Menu
        open={contextMenu !== null}
        onClose={handleCloseContextMenu}
        anchorReference="anchorPosition"
        anchorPosition={
          contextMenu !== null
            ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
            : undefined
        }
        elevation={2}
        sx={{ 
          '& .MuiPaper-root': {
            borderRadius: 2,
            minWidth: 180,
          }
        }}
      >
        <MenuItem 
          onClick={() => {
            handleCloseContextMenu();
            handleFileClick(contextMenu.file);
          }}
          sx={{ borderRadius: 1 }}
        >
          <ListItemIcon>
            {contextMenu?.file?.isDirectory ? 
              <FolderIcon fontSize="small" color="primary" /> : 
              <FileIcon fontSize="small" />
            }
          </ListItemIcon>
          <ListItemText primary="Open" />
        </MenuItem>
        
        <MenuItem 
          onClick={() => {
            handleCloseContextMenu();
            handleRenameClick(contextMenu.file);
          }}
          sx={{ borderRadius: 1 }}
        >
          <ListItemIcon>
            <EditIcon fontSize="small" color="primary" />
          </ListItemIcon>
          <ListItemText primary="Rename" />
        </MenuItem>
        
        {contextMenu?.file?.isDirectory ? (
          <MenuItem 
            onClick={() => {
              handleCloseContextMenu();
              handleDownloadFolder(contextMenu.file);
            }}
            sx={{ borderRadius: 1 }}
          >
            <ListItemIcon>
              <ArchiveIcon fontSize="small" color="info" />
            </ListItemIcon>
            <ListItemText primary="Download as ZIP" />
          </MenuItem>
        ) : canDownload ? (
          <MenuItem 
            onClick={() => {
              handleCloseContextMenu();
              handleDownloadFile(contextMenu.file);
            }}
            sx={{ borderRadius: 1 }}
          >
            <ListItemIcon>
              <DownloadIcon fontSize="small" color="info" />
            </ListItemIcon>
            <ListItemText primary="Download" />
          </MenuItem>
        ) : null}
        
        <Divider sx={{ my: 0.5 }} />
        
        {canEdit && (
          <MenuItem 
            onClick={() => {
              handleCloseContextMenu();
              handleDeleteFile(contextMenu.file);
            }}
            sx={{ borderRadius: 1 }}
          >
            <ListItemIcon>
              <DeleteIcon fontSize="small" color="error" />
            </ListItemIcon>
            <ListItemText primary="Delete" sx={{ color: 'error.main' }} />
          </MenuItem>
        )}
      </Menu>
      
      {/* Improved Dialog styling for all dialogs */}
      <Dialog 
        open={uploadDialogOpen} 
        onClose={handleUploadClose}
        PaperProps={{
          elevation: 2,
          sx: { borderRadius: 3 }
        }}
      >
        <DialogTitle sx={{ 
          pb: 1,
          borderBottom: '1px solid',
          borderColor: theme => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.06)',
          fontWeight: 600
        }}>
          Upload File
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <input 
            type="file" 
            onChange={handleFileInputChange} 
            style={{ 
              width: '100%',
              padding: '8px',
              border: '1px solid',
              borderColor: theme => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
              borderRadius: '8px',
            }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button onClick={handleUploadClose} variant="outlined" size="small">
            Cancel
          </Button>
          <Button 
            onClick={handleUploadFile} 
            variant="contained" 
            color="primary"
            size="small"
            disabled={!fileToUpload}
          >
            Upload
          </Button>
        </DialogActions>
      </Dialog>
      
      <Dialog 
        open={newFolderDialogOpen} 
        onClose={handleNewFolderClose}
        PaperProps={{
          elevation: 2,
          sx: { borderRadius: 3 }
        }}
      >
        <DialogTitle sx={{ 
          pb: 1,
          borderBottom: '1px solid',
          borderColor: theme => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.06)',
          fontWeight: 600
        }}>
          Create New Folder
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <TextField
            autoFocus
            margin="dense"
            label="Folder Name"
            type="text"
            fullWidth
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            variant="outlined"
            size="small"
            InputProps={{
              sx: { borderRadius: 2 }
            }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button onClick={handleNewFolderClose} variant="outlined" size="small">
            Cancel
          </Button>
          <Button 
            onClick={handleCreateFolder} 
            variant="contained" 
            color="primary"
            disabled={!newFolderName.trim()}
            size="small"
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>
      
      <Dialog 
        open={renameDialogOpen} 
        onClose={handleRenameClose}
        PaperProps={{
          elevation: 2,
          sx: { borderRadius: 3 }
        }}
      >
        <DialogTitle sx={{ 
          pb: 1,
          borderBottom: '1px solid',
          borderColor: theme => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.06)',
          fontWeight: 600
        }}>
          Rename {itemToRename?.isDirectory ? 'Folder' : 'File'}
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <TextField
            autoFocus
            margin="dense"
            label="New Name"
            type="text"
            fullWidth
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            variant="outlined"
            size="small"
            InputProps={{
              sx: { borderRadius: 2 }
            }}
          />
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button onClick={handleRenameClose} variant="outlined" size="small">
            Cancel
          </Button>
          <Button 
            onClick={handleRename} 
            variant="contained" 
            color="primary"
            disabled={!newName.trim()}
            size="small"
          >
            Rename
          </Button>
        </DialogActions>
      </Dialog>
      
      <Dialog 
        open={deleteConfirmOpen} 
        onClose={handleDeleteConfirmClose}
        PaperProps={{
          elevation: 2,
          sx: { borderRadius: 3 }
        }}
      >
        <DialogTitle sx={{ 
          pb: 1,
          borderBottom: '1px solid',
          borderColor: theme => theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.06)',
          fontWeight: 600,
          color: 'error.main'
        }}>
          Confirm Deletion
        </DialogTitle>
        <DialogContent sx={{ mt: 2 }}>
          <Typography variant="body2">
            Are you sure you want to delete {itemToDelete?.isDirectory ? 'folder' : 'file'}
            <Typography component="span" fontWeight="bold" sx={{ mx: 0.5 }}>
              {itemToDelete?.name}
            </Typography>
            ?
          </Typography>
          {itemToDelete?.isDirectory && (
            <Box sx={{ 
              mt: 2, 
              p: 1.5, 
              borderRadius: 2, 
              bgcolor: theme => theme.palette.mode === 'dark' ? 'rgba(244, 67, 54, 0.1)' : '#ffebee',
              border: '1px solid',
              borderColor: theme => theme.palette.mode === 'dark' ? 'rgba(244, 67, 54, 0.3)' : '#ffcdd2',
            }}>
              <Typography color="error" variant="body2" fontWeight={500} fontSize="0.875rem">
                Warning: All contents of this folder will be permanently deleted!
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button onClick={handleDeleteConfirmClose} variant="outlined" size="small">
            Cancel
          </Button>
          <Button 
            onClick={handleDeleteConfirm} 
            color="error" 
            variant="contained"
            size="small"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
      
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbar.severity} 
          sx={{ 
            width: '100%', 
            borderRadius: 2,
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)'
          }}
          variant="filled"
          elevation={6}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default FileBrowser;