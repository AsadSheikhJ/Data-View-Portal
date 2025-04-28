import React, { useState, useEffect } from 'react';
import { 
  Box, Button, TextField, Typography, Paper, 
  Container, Alert, CircularProgress
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, Navigate } from 'react-router-dom';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const { login, isAuthenticated, error: authError } = useAuth();
  const navigate = useNavigate();
  
  // Force navigation after successful login
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);
  
  // Use auth context error if available
  useEffect(() => {
    if (authError) {
      setError(authError);
      setLoading(false); // Ensure loading is turned off when error occurs
    }
  }, [authError]);
  
  const handleSubmit = async (e) => {
    // Prevent default form submission to avoid page refresh
    e.preventDefault();
    
    // Clear previous errors
    setError('');
    
    // Basic validation
    if (!email.trim()) {
      setError('Email is required');
      return;
    }
    
    if (!password) {
      setError('Password is required');
      return;
    }
    
    setLoading(true);
    
    try {
      console.log('Sending login request with:', { email, password: '***' });
      const success = await login(email, password);
      
      if (success) {
        console.log('Login successful');
        navigate('/dashboard', { replace: true });
      } else if (!error) {
        // Only set generic error if no specific error was set in auth context
        setError('Login failed. Please check your credentials.');
        setLoading(false);
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(err.message || 'An unexpected error occurred during login');
      setLoading(false);
    }
  };
  
  // If user is already logged in, redirect to dashboard
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return (
    <Container component="main" maxWidth="xs">
      <Box
        sx={{
          marginTop: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
        }}
      >
        <Paper
          elevation={3}
          sx={{
            padding: 4,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            width: '100%',
          }}
        >
          <Typography component="h1" variant="h5">
            Sign In
          </Typography>
          
          {error && (
            <Alert 
              severity="error" 
              sx={{ width: '100%', mt: 2 }}
              variant="filled"
              onClose={() => setError('')}
            >
              {error}
            </Alert>
          )}
          
          <Box 
            component="form" 
            onSubmit={handleSubmit} 
            noValidate 
            sx={{ mt: 1, width: '100%' }}
          >
            <TextField
              margin="normal"
              required
              fullWidth
              id="email"
              label="Email Address"
              name="email"
              autoComplete="email"
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              error={!!error && !email.trim()}
              // Clear error when typing
              onFocus={() => error && setError('')}
            />
            <TextField
              margin="normal"
              required
              fullWidth
              name="password"
              label="Password"
              type="password"
              id="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              error={!!error && !password}
              // Clear error when typing
              onFocus={() => error && setError('')}
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              disabled={loading}
            >
              {loading ? <CircularProgress size={24} /> : 'Sign In'}
            </Button>
            
            <Typography variant="body2" sx={{ mt: 2, textAlign: 'center' }}>
            </Typography>
          </Box>
        </Paper>
      </Box>
    </Container>
  );
};

export default Login;
