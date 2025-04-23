const validateLoginRequest = (req, res, next) => {
  try {
    console.log('Original request body:', req.body);
    
    // Handle undefined or null body
    if (!req.body) {
      console.log('Request body is missing');
      return res.status(400).json({ message: 'Request body is required' });
    }
    
    // Extract email and password
    const email = req.body.email;
    const password = req.body.password;
    
    console.log('Extracted credentials:', {
      password : password,
      email : email,
      hasEmail: !!email, 
      emailType: typeof email,
      hasPassword: !!password, 
      passwordType: typeof password 
    });

    // Minimal validation - just check if they exist
    if (!email || !password) {
      console.log('Email or password is missing');
      return res.status(400).json({ message: 'Email and password are required' });
    }
    
    // Success - proceed to next middleware
    next();
  } catch (error) {
    console.error('Validation error:', error);
    res.status(500).json({ message: 'Server error during validation' });
  }
};

module.exports = { validateLoginRequest };
