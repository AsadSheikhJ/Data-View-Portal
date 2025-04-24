import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Paper, List, ListItem, ListItemIcon, ListItemText,
  IconButton, Button, Divider, TextField, Dialog, DialogTitle,
  DialogContent, DialogActions, Menu, MenuItem, CircularProgress,
  Breadcrumbs, Link, Tooltip, Snackbar, Alert, FormControl, InputLabel, Select
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
  const [selectedFile, setSelectedFile] = useState(null);
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
      console.log(`Loading files for path: ${currentPath}`);
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
      <Paper sx={{ p: 2, mb: 2 }}>
        {/* Remove the directory selector and replace with just the action buttons */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6">
            File Browser
          </Typography>
          
          <Box>
            {canEdit && (
              <>
                <Button
                  startIcon={<NewFolderIcon />}
                  onClick={handleNewFolderClick}
                  sx={{ mr: 1 }}
                >
                  New Folder
                </Button>
                <Button
                  startIcon={<UploadIcon />}
                  variant="contained"
                  onClick={handleUploadClick}
                >
                  Upload
                </Button>
              </>
            )}
          </Box>
        </Box>

        {/* Breadcrumbs navigation */}
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          {currentPath && (
            <IconButton onClick={handleNavigateBack} size="small" sx={{ mr: 1 }}>
              <ArrowBackIcon />
            </IconButton>
          )}
          <Breadcrumbs 
            separator={<NavigateNextIcon fontSize="small" />}
            aria-label="breadcrumb"
          >
            {renderBreadcrumbs()}
          </Breadcrumbs>
        </Box>
        
        <Divider />
        
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', my: 4 }}>
            <CircularProgress />
          </Box>
        ) : error ? (
          <Typography color="error" sx={{ my: 2 }}>
            {error}
          </Typography>
        ) : (
          <List>
            {/* Ensure files is an array and check its length safely */}
            {Array.isArray(files) && files.length > 0 ? (
              files.map((file) => (
                <ListItem
                  key={file.path || Math.random()}
                  component="div"
                  sx={{ cursor: 'pointer' }}
                  onClick={() => handleFileClick(file)}
                  onContextMenu={(e) => handleContextMenu(e, file)}
                >
                  <ListItemIcon>
                    {file.isDirectory ? <FolderIcon color="primary" /> : <FileIcon />}
                  </ListItemIcon>
                  <ListItemText
                    primary={file.name}
                    secondary={file.isDirectory ? `${file.modifiedAt ? new Date(file.modifiedAt).toLocaleString() : ''}` : `${fileService.formatFileSize(file.size)} • ${file.modifiedAt ? new Date(file.modifiedAt).toLocaleString() : ''}`}
                  />
                  <Box>
                    {/* Replace direct action buttons with a 3-dot menu */}
                    {canEdit && (
                      <IconButton onClick={(e) => handleActionMenuOpen(file, e)}>
                        <MoreIcon />
                      </IconButton>
                    )}
                  </Box>
                </ListItem>
              ))
            ) : (
              <Typography variant="body2" sx={{ p: 2 }}>
                This folder is empty
              </Typography>
            )}
          </List>
        )}
      </Paper>
      
      {/* Action Menu (3-dot menu) */}
      <Menu
        anchorEl={actionMenuAnchor}
        open={Boolean(actionMenuAnchor)}
        onClose={handleActionMenuClose}
      >
        {/* Rename option for all items */}
        <MenuItem onClick={() => handleRenameClick(selectedItem)}>
          <ListItemIcon>
            <EditIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Rename</ListItemText>
        </MenuItem>
        
        {/* Download option for files */}
        {selectedItem && !selectedItem.isDirectory && canDownload && (
          <MenuItem onClick={() => {
            handleActionMenuClose();
            handleDownloadFile(selectedItem);
          }}>
            <ListItemIcon>
              <DownloadIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Download</ListItemText>
          </MenuItem>
        )}
        
        {/* Download as ZIP option for folders */}
        {selectedItem && selectedItem.isDirectory && canDownload && (
          <MenuItem onClick={() => handleDownloadFolder(selectedItem)}>
            <ListItemIcon>
              <ArchiveIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Download as ZIP</ListItemText>
          </MenuItem>
        )}
        
        {/* Delete option for all items */}
        {canEdit && (
          <MenuItem onClick={() => handleDeleteClick(selectedItem)}>
            <ListItemIcon>
              <DeleteIcon fontSize="small" color="error" />
            </ListItemIcon>
            <ListItemText sx={{ color: 'error.main' }}>Delete</ListItemText>
          </MenuItem>
        )}
      </Menu>
      
      {/* Rename Dialog */}
      <Dialog open={renameDialogOpen} onClose={handleRenameClose}>
        <DialogTitle>Rename {itemToRename?.isDirectory ? 'Folder' : 'File'}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="New Name"
            type="text"
            fullWidth
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleRenameClose}>Cancel</Button>
          <Button onClick={handleRename} color="primary">Rename</Button>
        </DialogActions>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onClose={handleDeleteConfirmClose}>
        <DialogTitle>Confirm Deletion</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete {itemToDelete?.isDirectory ? 'folder' : 'file'} 
            <strong> {itemToDelete?.name}</strong>?
          </Typography>
          {itemToDelete?.isDirectory && (
            <Typography color="error" sx={{ mt: 2 }}>
              Warning: All contents of this folder will be permanently deleted!
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteConfirmClose}>Cancel</Button>
          <Button onClick={handleDeleteConfirm} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
      
      <Menu
        open={contextMenu !== null}
        onClose={handleCloseContextMenu}
        anchorReference="anchorPosition"
        anchorPosition={
          contextMenu !== null
            ? { top: contextMenu.mouseY, left: contextMenu.mouseX }
            : undefined
        }
      >
        <MenuItem onClick={() => {
          handleCloseContextMenu();
          handleFileClick(contextMenu.file);
        }}>
          Open
        </MenuItem>
        <MenuItem onClick={() => {
          handleCloseContextMenu();
          handleRenameClick(contextMenu.file);
        }}>
          Rename
        </MenuItem>
        {contextMenu?.file?.isDirectory ? (
          <MenuItem onClick={() => {
            handleCloseContextMenu();
            handleDownloadFolder(contextMenu.file);
          }}>
            Download as ZIP
          </MenuItem>
        ) : canDownload ? (
          <MenuItem onClick={() => {
            handleCloseContextMenu();
            handleDownloadFile(contextMenu.file);
          }}>
            Download
          </MenuItem>
        ) : null}
        {canEdit && (
          <MenuItem onClick={() => {
            handleCloseContextMenu();
            handleDeleteFile(contextMenu.file);
          }}>
            Delete
          </MenuItem>
        )}
      </Menu>
      <Dialog open={uploadDialogOpen} onClose={handleUploadClose}>
        <DialogTitle>Upload File</DialogTitle>
        <DialogContent>
          <input type="file" onChange={handleFileInputChange} />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleUploadClose}>Cancel</Button>
          <Button onClick={handleUploadFile}>Upload</Button>
        </DialogActions>
      </Dialog>
      <Dialog open={newFolderDialogOpen} onClose={handleNewFolderClose}>
        <DialogTitle>Create New Folder</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Folder Name"
            type="text"
            fullWidth
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleNewFolderClose}>Cancel</Button>
          <Button onClick={handleCreateFolder}>Create</Button>
        </DialogActions>
      </Dialog>
      <Dialog open={renameDialogOpen} onClose={handleRenameClose}>
        <DialogTitle>Rename {itemToRename?.isDirectory ? 'Folder' : 'File'}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="New Name"
            type="text"
            fullWidth
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleRenameClose}>Cancel</Button>
          <Button onClick={handleRename}>Rename</Button>
        </DialogActions>
      </Dialog>
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default FileBrowser;