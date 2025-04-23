// Diagnostic script to isolate backend errors
console.log('Starting diagnostic test...');

try {
  console.log('1. Testing config loading...');
  const config = require('./config/config');
  console.log('Config loaded successfully:', config);

  console.log('\n2. Testing User model...');
  const { User, createDefaultAdmin } = require('./models/User');
  console.log('User model loaded successfully');

  console.log('\n3. Testing route files...');
  console.log('Loading index route...');
  const indexRouter = require('./routes/index');
  console.log('Loading users route...');
  const usersRouter = require('./routes/users');
  
  console.log('Loading auth route...');
  try {
    const authRouter = require('./routes/api/auth');
    console.log('Auth route loaded successfully');
  } catch (err) {
    console.error('Error loading auth route:', err);
  }
  
  console.log('Loading files route...');
  try {
    const filesRouter = require('./routes/api/files');
    console.log('Files route loaded successfully');
  } catch (err) {
    console.error('Error loading files route:', err);
  }

  console.log('\n4. Testing middleware...');
  try {
    const authMiddleware = require('./middlewares/auth');
    console.log('Auth middleware loaded successfully');
  } catch (err) {
    console.error('Error loading auth middleware:', err);
  }

  console.log('\nDiagnostic complete. If no errors were shown above, check for runtime errors in app.js');
} catch (err) {
  console.error('Diagnostic failed with error:', err);
}