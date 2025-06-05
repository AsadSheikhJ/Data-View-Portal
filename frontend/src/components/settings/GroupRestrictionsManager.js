import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  CircularProgress,
  Button,
  Alert,
  Autocomplete,
  TextField,
  Chip
} from '@mui/material';
import fileService from '../../services/fileService'; // Corrected path

const GroupRestrictionsManager = ({ 
  selectedGroupId, 
  currentGroupDetails,
  currentGroupPathInput, // Main path for the group, for context
  isLoadingGroupDetails,
  onSaveRestrictions, // Callback to save
  isSavingRestrictions,
  restrictionsError: parentRestrictionsError, // Error from parent (e.g., loading group details)
  setRestrictionsError: setParentRestrictionsError
}) => {
  const [availableSubdirectories, setAvailableSubdirectories] = useState([]);
  const [selectedForRestriction, setSelectedForRestriction] = useState([]);
  const [isLoadingAvailableSubdirs, setIsLoadingAvailableSubdirs] = useState(false);
  const [fetchSubdirsError, setFetchSubdirsError] = useState('');

  // Effect to derive initial selectedForRestriction from currentGroupDetails
  useEffect(() => {
    if (currentGroupDetails && currentGroupDetails.restrictedSubDirectories) {
      setSelectedForRestriction(currentGroupDetails.restrictedSubDirectories);
    } else {
      setSelectedForRestriction([]);
    }
  }, [currentGroupDetails]);

  // Effect to fetch available subdirectories when group/path changes
  useEffect(() => {
    if (selectedGroupId && currentGroupPathInput) {
      const fetchSubdirs = async () => {
        setIsLoadingAvailableSubdirs(true);
        setFetchSubdirsError('');
        setParentRestrictionsError(''); // Clear any parent-level errors related to restrictions
        try {
          const subdirs = await fileService.getGroupSubdirectories(selectedGroupId);
          setAvailableSubdirectories(subdirs || []);
        } catch (error) {
          console.error('Error fetching available subdirectories:', error);
          const errorMsg = error.message || 'Failed to load available subdirectories.';
          setFetchSubdirsError(errorMsg);
          // Optionally bubble up to parent if it's a critical load failure for this component
          // setParentRestrictionsError(errorMsg); 
        }
        setIsLoadingAvailableSubdirs(false);
      };
      fetchSubdirs();
    } else {
      setAvailableSubdirectories([]); // Clear if no group or path
    }
  }, [selectedGroupId, currentGroupPathInput, setParentRestrictionsError]);

  const handleSelectionChange = (event, newValue) => {
    setSelectedForRestriction(newValue);
    if(fetchSubdirsError) setFetchSubdirsError(''); // Clear local error on interaction
    if(parentRestrictionsError) setParentRestrictionsError(''); // Clear parent error on interaction
  };

  const handleSave = async () => {
    // Clear local errors first
    setFetchSubdirsError('');
    if (parentRestrictionsError) setParentRestrictionsError('');

    try {
      await onSaveRestrictions(selectedGroupId, selectedForRestriction);
      // Parent will show success snackbar and update currentGroupDetails
    } catch (error) {
      // Error during save is propagated from parent and should be set there,
      // but we can also set a local one or rely on parent's display.
      // For now, parent handles displaying save errors via restrictionsError prop.
      // If onSaveRestrictions throws, the parent's catch block handles it.
      // setParentRestrictionsError(error.message || "Failed to save restrictions from manager.");
      console.error("Error caught by GroupRestrictionsManager during save:", error);
    }
  };
  
  // Display loading state from parent if group details are still loading
  if (isLoadingGroupDetails) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', my: 2 }}>
        <CircularProgress size={24} sx={{ mr: 1 }} />
        <Typography>Loading group details...</Typography>
      </Box>
    );
  }

  // If no group is properly selected or details are missing (after parent loading is done)
  if (!selectedGroupId || !currentGroupDetails) {
    // This message might be redundant if parent already shows one, but good for component self-containment
    return (
      <Typography variant="body2" color="text.secondary" sx={{ my: 2, fontStyle: 'italic' }}>
        Select a group and ensure its path is configured to manage restrictions.
      </Typography>
    );
  }

  // If group path is not set, restrictions cannot be managed
  if (!currentGroupPathInput) {
     return (
        <Alert severity="info" sx={{mt: 2}}>
            The selected group does not have a main directory path configured. Please set it above to manage subdirectory restrictions.
        </Alert>
     );
  }

  const hasChanges = JSON.stringify(selectedForRestriction.sort()) !== JSON.stringify((currentGroupDetails.restrictedSubDirectories || []).sort());

  return (
    <Box sx={{ mt: 2, py: 2, borderTop: '1px solid divider' }}>
      <Typography variant="subtitle1" gutterBottom sx={{fontWeight: 'medium'}}>
        Restricted Subdirectories for "{currentGroupDetails.name}"
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Users in this group ({currentGroupDetails.users?.map(u => u.user?.username || u.user?.id || 'Unknown').join(', ') || 'No users'}): 
        will not be able to see or access the selected subdirectories within the group's main path 
        (<code>{currentGroupPathInput}</code>)      </Typography>

      {isLoadingAvailableSubdirs ? (
        <CircularProgress sx={{ my: 2 }} />
      ) : fetchSubdirsError ? (
        <Alert severity="error" sx={{my: 2}} onClose={() => setFetchSubdirsError('')}>{fetchSubdirsError}</Alert>
      ) : (
        <Autocomplete
          multiple
          id={`group-restrictions-autocomplete-${selectedGroupId}`}
          options={availableSubdirectories}
          value={selectedForRestriction}
          onChange={handleSelectionChange}
          getOptionLabel={(option) => option} // Assuming options are strings (directory names)
          isOptionEqualToValue={(option, value) => option === value}
          renderInput={(params) => (
            <TextField
              {...params}
              variant="outlined"
              label="Select Subdirectories to Restrict"
              placeholder={availableSubdirectories.length > 0 ? "Choose from list" : "No subdirectories found or path not set"}
            />
          )}
          renderTags={(value, getTagProps) =>
            value.map((option, index) => (
              <Chip variant="outlined" label={option} {...getTagProps({ index })} />
            ))
          }
          disabled={isSavingRestrictions || availableSubdirectories.length === 0}
          sx={{ mb: 2 }}
        />
      )}
      
      {parentRestrictionsError && !fetchSubdirsError && (
        // Show parent-level errors if not overridden by a local fetch error
        <Alert severity="error" sx={{ mt: 2 }} onClose={() => setParentRestrictionsError('')}>
          {parentRestrictionsError}
        </Alert>
      )}

      <Button 
        variant="contained" 
        onClick={handleSave} 
        disabled={isLoadingAvailableSubdirs || isSavingRestrictions || !hasChanges || !!fetchSubdirsError}
      >
        {isSavingRestrictions ? <CircularProgress size={24} /> : 'Save Restrictions'}
      </Button>
    </Box>
  );
};

export default GroupRestrictionsManager; 