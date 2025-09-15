const express = require('express');
const { 
  register, 
  login, 
  getMe, 
  updatePassword, 
  logout 
} = require('../controllers/authController');
const { 
  validateUserRegistration, 
  validateUserLogin 
} = require('../middleware/validation');
const { protect, authorize } = require('../middleware/auth');
const { body } = require('express-validator');

const router = express.Router();

// Public routes
router.post('/login', validateUserLogin, login);
router.post('/logout', logout);

// Registration - typically restricted to admin
router.post(
  '/register', 
  protect, 
  authorize('Admin', 'HR'), 
  validateUserRegistration, 
  register
);

// Protected routes
router.get('/me', protect, getMe);

router.put('/password', [
  protect,
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 6 })
    .withMessage('New password must be at least 6 characters long'),
], updatePassword);

module.exports = router;