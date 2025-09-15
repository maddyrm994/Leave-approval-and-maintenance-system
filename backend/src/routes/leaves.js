const express = require('express');
const {
  createLeaveRequest,
  getLeaveRequests,
  getActionableRequests,
  getLeaveRequest,
  updateLeaveStatus,
  cancelLeaveRequest
} = require('../controllers/leaveController');
const {
  validateLeaveRequest,
  validateLeaveStatusUpdate,
  validateMongoId,
  validateLeaveQuery
} = require('../middleware/validation');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// All routes require authentication
router.use(protect);

// Create new leave request - all authenticated users except admin
router.post('/', 
  authorize('Employee', 'Manager', 'HR'), 
  validateLeaveRequest, 
  createLeaveRequest
);

// Get leave requests with filtering and pagination
router.get('/', 
  validateLeaveQuery, 
  getLeaveRequests
);

// Get actionable requests (pending approval) - for managers, HR, and admin
router.get('/actionable', 
  authorize('Manager', 'HR', 'Admin'), 
  getActionableRequests
);

// Get single leave request
router.get('/:id', 
  validateMongoId('id'), 
  getLeaveRequest
);

// Update leave request status (approve/reject) - managers, HR, admin
router.put('/:id/status', 
  validateMongoId('id'), 
  authorize('Manager', 'HR', 'Admin'), 
  validateLeaveStatusUpdate, 
  updateLeaveStatus
);

// Cancel leave request - only the applicant
router.put('/:id/cancel', 
  validateMongoId('id'), 
  cancelLeaveRequest
);

module.exports = router;