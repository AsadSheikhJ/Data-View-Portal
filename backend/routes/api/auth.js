// filepath: c:\Users\asad.jamal\Desktop\Project Data & Files\PRISMA Project\Pyhton Scripts\Data View Portal\backend\routes\api\auth.js
const express = require('express');
const router = express.Router();
const authController = require('../../controllers/authController');
const { auth, checkRole } = require('../../middlewares/auth');

// @route   POST api/auth/register
// @desc    Register a new user (admin only for creation of other admins/editors)
// @access  Public for basic users, Private for admin/editor roles
router.post('/register', authController.register);

// @route   POST api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post('/login', authController.login);

// @route   GET api/auth/user
// @desc    Get authenticated user data
// @access  Private
router.get('/user', auth, authController.getUser);

// @route   GET api/auth/users
// @desc    Get all users (admin only)
// @access  Private/Admin
router.get('/users', auth, checkRole('admin'), authController.getAllUsers);

// @route   PUT api/auth/user/:id
// @desc    Update a user
// @access  Private (own account) or Admin (any account)
router.put('/user/:id', auth, authController.updateUser);

// @route   DELETE api/auth/user/:id
// @desc    Delete a user
// @access  Private/Admin
router.delete('/user/:id', auth, checkRole('admin'), authController.deleteUser);

// @route   PATCH api/auth/user/:id/toggle-activation
// @desc    Toggle user activation status
// @access  Private/Admin
router.patch('/user/:id/toggle-activation', auth, checkRole('admin'), authController.toggleUserActivation);

module.exports = router;