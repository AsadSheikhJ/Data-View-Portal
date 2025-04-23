import React, { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { 
  Button, TextField, Typography, Container, Box, 
  Paper, Avatar, Alert, CircularProgress
} from '@mui/material';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { useAuth } from '../contexts/AuthContext';
import API from '../utils/api';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const navigate = useNavigate();
  const { login, isLoggedIn, loading } = useAuth();
  
  // Only redirect after authentication check is complete
  if (!loading && isLoggedIn) {
    return <Navigate to="/dashboard" />;
  }
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Prevent submission when already loading
    if (isLoading) return;
    
    setErrorMessage('');
    setIsLoading(true);
    
    try {
      console.log('Sending login request with:', { email, password: '***' });
      
      const response = await API.post('/api/auth/login', {
        email: email.trim(),
        password: password.trim()
      });
      
      console.log('Login successful');
      
      // Store token and user data
      if (response.data.token) {
        localStorage.setItem('token', response.data.token);
        login(response.data.user);
        navigate('/dashboard');
      } else {
        throw new Error('No token received');
      }
    } catch (error) {
      console.error('Login error:', error);
      setErrorMessage(
        error.response?.data?.message || 
        error.message || 
        'Login failed. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <Container component="main" maxWidth="xs">
      <Paper elevation={3} sx={{ mt: 8, p: 4, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Avatar sx={{ m: 1, bgcolor: 'primary.main' }}>
          <LockOutlinedIcon />
        </Avatar>
        <Typography component="h1" variant="h5">
          Sign in to File Manager
        </Typography>
        
        {errorMessage && (
          <Alert severity="error" sx={{ width: '100%', mt: 2 }}>
            {errorMessage}
          </Alert>
        )}
        
        <Box component="form" onSubmit={handleSubmit} sx={{ mt: 1, width: '100%' }}>
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
          />
          <Button
            type="submit"
            fullWidth
            variant="contained"
            sx={{ mt: 3, mb: 2 }}
            disabled={isLoading}
          >
            {isLoading ? <CircularProgress size={24} /> : 'Sign In'}
          </Button>
          
          <Typography variant="body2" color="text.secondary" align="center">
            Default admin credentials: admin@example.com / adminPassword123
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
};

export default Login;