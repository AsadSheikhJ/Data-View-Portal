import React, { createContext, useContext, useState, useEffect } from 'react';
import { Snackbar, Alert } from '@mui/material';

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const [notification, setNotification] = useState({
    open: false,
    message: '',
    severity: 'info',
    autoHideDuration: 3000
  });

  const showNotification = (message, severity = 'info', autoHideDuration = 3000) => {
    setNotification({
      open: true,
      message,
      severity,
      autoHideDuration
    });
  };

  const hideNotification = () => {
    setNotification(prev => ({ ...prev, open: false }));
  };

  useEffect(() => {
    const handleShowNotification = (event) => {
      const { message, severity, autoHideDuration } = event.detail;
      showNotification(message, severity, autoHideDuration);
    };

    window.addEventListener('showNotification', handleShowNotification);
    return () => {
      window.removeEventListener('showNotification', handleShowNotification);
    };
  }, []);

  return (
    <NotificationContext.Provider value={{ showNotification }}>
      {children}
      <Snackbar
        open={notification.open}
        autoHideDuration={notification.autoHideDuration}
        onClose={hideNotification}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert 
          onClose={hideNotification} 
          severity={notification.severity} 
          sx={{ width: '100%' }}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </NotificationContext.Provider>
  );
};

export const useNotification = () => useContext(NotificationContext); 