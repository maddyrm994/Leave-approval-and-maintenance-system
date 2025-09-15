const express = require('express');
const {
  getUsers,
  getUser,
  updateUser,
  deleteUser,
  getTeamMembers,
  getUserStats
} = require('../controllers/userController');
const {
  validateMongoId,
  validateUserUpdate
} = require('../middleware/validation');
const { protect, authorize, authorizeOwnerOrRole } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(protect);

// Get all users - restricted to HR and Admin
router.get('/', authorize('HR', 'Admin'), getUsers);

// Get team members - for managers, HR, and admin
router.get('/team', authorize('Manager', 'HR', 'Admin'), getTeamMembers);

// Get single user - users can view their own profile, managers can view team members, HR/Admin can view all
router.get('/:id', 
  validateMongoId('id'), 
  authorizeOwnerOrRole('Manager', 'HR', 'Admin'), 
  getUser
);

// Get user statistics - users can view their own stats, managers can view team stats, HR/Admin can view all
router.get('/:id/stats', 
  validateMongoId('id'), 
  authorizeOwnerOrRole('Manager', 'HR', 'Admin'), 
  getUserStats
);

// Update user - users can update their own basic info, HR/Admin can update all fields
router.put('/:id', 
  validateMongoId('id'), 
  authorizeOwnerOrRole('HR', 'Admin'), 
  validateUserUpdate, 
  updateUser
);

// Delete user - only admin
router.delete('/:id', 
  validateMongoId('id'), 
  authorize('Admin'), 
  deleteUser
);

module.exports = router;