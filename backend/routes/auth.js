const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const { validateLoginRequest } = require('../middleware/validateRequest');

const usersPath = path.join(__dirname, '../data/users.json');

router.post('/login', async (req, res) => {
  try {
    console.log('Login request received:', {
      email: typeof req.body.email,
      password: typeof req.body.password,
      bodyKeys: Object.keys(req.body)
    });

    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      console.log('Missing required fields:', { hasEmail: !!email, hasPassword: !!password });
      return res.status(400).json({ message: 'Email and password are required' });
    }

    console.log('Login attempt with trimmed values:', { email, password }); // Debug log

    let usersData;
    try {
      usersData = JSON.parse(fs.readFileSync(usersPath));
    } catch (err) {
      console.error('Error parsing users.json:', err);
      return res.status(500).json({ message: 'Server configuration error' });
    }

    const user = usersData.users.find(u => u.email === email);

    if (!user) {
      console.log('User not found');
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    console.log('User found:', user); // Debug log
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      console.log('Password mismatch');
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000
    });

    const { password: _, ...userWithoutPassword } = user;
    console.log('User data without password:', userWithoutPassword); // Debug log
    console.log('Token generated:', token); // Debug log
    res.json({ user: userWithoutPassword, token });
  } catch (error) {
    console.error('Login processing error:', error);
    res.status(500).json({ 
      message: 'Login failed',
      error: error.message
    });
  }
});

// Add this new route to verify authentication and get user data
router.get('/me', async (req, res) => {
  try {
    const token = req.cookies?.token || req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return res.status(401).json({ message: 'Invalid token' });
    }

    if (!decoded || !decoded.id) {
      return res.status(401).json({ message: 'Invalid token content' });
    }

    let usersData;
    try {
      usersData = JSON.parse(fs.readFileSync(usersPath));
    } catch (err) {
      console.error('Error parsing users.json:', err);
      return res.status(500).json({ message: 'Server configuration error' });
    }

    const user = usersData.users.find(u => u.id === decoded.id);
    
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    const { password: _, ...userWithoutPassword } = user;
    res.json({ user: userWithoutPassword });
  } catch (error) {
    console.error('Auth verification error:', error);
    res.status(401).json({ message: 'Authentication failed' });
  }
});

module.exports = router;
