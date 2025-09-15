const User = require('../models/User');

/**
 * Format date to YYYY-MM-DD string
 * @param {Date} date - Date object to format
 * @returns {string} - Formatted date string
 */
const formatDate = (date) => {
  return new Date(date).toISOString().split('T')[0];
};

/**
 * Calculate business days between two dates (excluding weekends)
 * @param {Date} startDate - Start date
 * @param {Date} endDate - End date
 * @returns {number} - Number of business days
 */
const calculateBusinessDays = (startDate, endDate) => {
  let count = 0;
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  while (start <= end) {
    const dayOfWeek = start.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Not Sunday (0) or Saturday (6)
      count++;
    }
    start.setDate(start.getDate() + 1);
  }
  
  return count;
};

/**
 * Get user's hierarchy (manager chain)
 * @param {string} userId - User ID
 * @returns {Array} - Array of user objects in hierarchy
 */
const getUserHierarchy = async (userId) => {
  const hierarchy = [];
  let currentUser = await User.findById(userId).populate('manager');
  
  while (currentUser) {
    hierarchy.push({
      id: currentUser._id,
      name: currentUser.name,
      role: currentUser.role,
      email: currentUser.email
    });
    
    currentUser = currentUser.manager;
  }
  
  return hierarchy;
};

/**
 * Check if user has permission to access resource
 * @param {Object} user - Current user object
 * @param {string} resourceUserId - Resource owner's user ID
 * @param {Array} allowedRoles - Roles that have access
 * @returns {boolean} - Whether user has access
 */
const hasPermission = (user, resourceUserId, allowedRoles = []) => {
  // User accessing their own resource
  if (user._id.toString() === resourceUserId) {
    return true;
  }
  
  // User has one of the allowed roles
  if (allowedRoles.includes(user.role)) {
    return true;
  }
  
  return false;
};

/**
 * Generate pagination metadata
 * @param {number} page - Current page
 * @param {number} limit - Items per page
 * @param {number} total - Total items
 * @returns {Object} - Pagination object
 */
const getPaginationData = (page, limit, total) => {
  return {
    page: parseInt(page),
    limit: parseInt(limit),
    total,
    pages: Math.ceil(total / limit),
    hasNext: page * limit < total,
    hasPrev: page > 1
  };
};

/**
 * Validate leave request business rules
 * @param {Object} leaveData - Leave request data
 * @param {Object} user - User object
 * @returns {Object} - Validation result
 */
const validateLeaveRules = (leaveData, user) => {
  const errors = [];
  
  // Check if start date is not in the past
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const startDate = new Date(leaveData.startDate);
  
  if (startDate < today) {
    errors.push('Leave start date cannot be in the past');
  }
  
  // Check advance notice requirements
  const daysDifference = Math.ceil((startDate - today) / (1000 * 60 * 60 * 24));
  
  if (leaveData.leaveType === 'Normal' && daysDifference < 3) {
    errors.push('Normal leave requires at least 3 days advance notice');
  }
  
  // Check maximum consecutive leave days
  if (leaveData.leaveType === 'Normal') {
    const leaveDays = Math.ceil((new Date(leaveData.endDate) - new Date(leaveData.startDate)) / (1000 * 60 * 60 * 24)) + 1;
    
    if (leaveDays > 15) {
      errors.push('Normal leave cannot exceed 15 consecutive days without special approval');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

/**
 * Calculate leave duration including weekends
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @param {boolean} isHalfDay - Whether it's a half day
 * @returns {number} - Duration in days
 */
const calculateLeaveDuration = (startDate, endDate, isHalfDay = false) => {
  if (isHalfDay) {
    return 0.5;
  }
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  const timeDiff = end.getTime() - start.getTime();
  
  return Math.ceil(timeDiff / (1000 * 60 * 60 * 24)) + 1;
};

/**
 * Get leave request status color for UI
 * @param {string} status - Leave status
 * @returns {string} - Color code
 */
const getStatusColor = (status) => {
  const colors = {
    'Pending Manager Approval': 'orange',
    'Pending HR Approval': 'orange',
    'Pending Admin Approval': 'orange',
    'Approved': 'green',
    'Rejected': 'red',
    'Cancelled': 'gray'
  };
  
  return colors[status] || 'gray';
};

/**
 * Sanitize user input to prevent XSS
 * @param {string} input - User input string
 * @returns {string} - Sanitized string
 */
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return input;
  
  return input
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

/**
 * Generate leave request reference number
 * @param {string} userId - User ID
 * @param {string} leaveType - Leave type
 * @returns {string} - Reference number
 */
const generateReferenceNumber = (userId, leaveType) => {
  const year = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, '0');
  const userIdShort = userId.toString().slice(-4);
  const leaveTypeShort = leaveType.charAt(0).toUpperCase();
  const timestamp = Date.now().toString().slice(-4);
  
  return `LR${year}${month}${userIdShort}${leaveTypeShort}${timestamp}`;
};

module.exports = {
  formatDate,
  calculateBusinessDays,
  getUserHierarchy,
  hasPermission,
  getPaginationData,
  validateLeaveRules,
  calculateLeaveDuration,
  getStatusColor,
  sanitizeInput,
  generateReferenceNumber
};