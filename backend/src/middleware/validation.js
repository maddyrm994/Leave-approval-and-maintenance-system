const { body, param, query, validationResult } = require('express-validator');

// Middleware to handle validation errors
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  
  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map(error => ({
      field: error.path,
      message: error.msg,
      value: error.value
    }));
    
    return res.status(400).json({
      success: false,
      message: 'Validation errors occurred',
      errors: errorMessages
    });
  }
  
  next();
};

// User validation rules
const validateUserRegistration = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long'),
  
  body('role')
    .optional()
    .isIn(['Employee', 'Manager', 'HR', 'Admin'])
    .withMessage('Invalid role specified'),
  
  body('managerId')
    .optional()
    .isMongoId()
    .withMessage('Invalid manager ID format'),
  
  handleValidationErrors
];

const validateUserLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  
  handleValidationErrors
];

// Leave request validation rules
const validateLeaveRequest = [
  body('leaveType')
    .isIn(['Normal', 'Sick', 'Emergency', 'Permission'])
    .withMessage('Invalid leave type'),
  
  body('startDate')
    .isISO8601({ strict: true })
    .toDate()
    .withMessage('Start date must be a valid date in YYYY-MM-DD format'),
  
  body('endDate')
    .isISO8601({ strict: true })
    .toDate()
    .withMessage('End date must be a valid date in YYYY-MM-DD format'),
  
  body('reason')
    .trim()
    .notEmpty()
    .withMessage('Reason is required')
    .isLength({ min: 5, max: 500 })
    .withMessage('Reason must be between 5 and 500 characters'),
  
  body('isHalfDay')
    .optional()
    .isBoolean()
    .withMessage('isHalfDay must be a boolean value'),
  
  body('durationHours')
    .optional()
    .isFloat({ min: 0.5, max: 24 })
    .withMessage('Duration hours must be between 0.5 and 24'),
  
  // Custom validation for Permission type leaves
  body('durationHours').custom((value, { req }) => {
    if (req.body.leaveType === 'Permission' && !value) {
      throw new Error('Duration hours is required for Permission type leaves');
    }
    return true;
  }),
  
  // Custom validation for date logic
  body('endDate').custom((value, { req }) => {
    if (new Date(value) < new Date(req.body.startDate)) {
      throw new Error('End date cannot be before start date');
    }
    return true;
  }),
  
  handleValidationErrors
];

const validateLeaveStatusUpdate = [
  body('status')
    .isIn(['Pending Manager Approval', 'Pending HR Approval', 'Pending Admin Approval', 'Approved', 'Rejected', 'Cancelled'])
    .withMessage('Invalid leave status'),
  
  body('comments')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Comments cannot exceed 200 characters'),
  
  handleValidationErrors
];

// Parameter validation
const validateMongoId = (paramName) => [
  param(paramName)
    .isMongoId()
    .withMessage(`Invalid ${paramName} format`),
  
  handleValidationErrors
];

// Query validation for filtering
const validateLeaveQuery = [
  query('status')
    .optional()
    .isIn(['Pending Manager Approval', 'Pending HR Approval', 'Pending Admin Approval', 'Approved', 'Rejected', 'Cancelled'])
    .withMessage('Invalid status filter'),
  
  query('leaveType')
    .optional()
    .isIn(['Normal', 'Sick', 'Emergency', 'Permission'])
    .withMessage('Invalid leave type filter'),
  
  query('startDate')
    .optional()
    .isISO8601({ strict: true })
    .withMessage('Start date filter must be in YYYY-MM-DD format'),
  
  query('endDate')
    .optional()
    .isISO8601({ strict: true })
    .withMessage('End date filter must be in YYYY-MM-DD format'),
  
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  
  handleValidationErrors
];

const validateUserUpdate = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('role')
    .optional()
    .isIn(['Employee', 'Manager', 'HR', 'Admin'])
    .withMessage('Invalid role specified'),
  
  body('leaveBalances.normal')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Normal leave balance must be a positive number'),
  
  body('leaveBalances.sick')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Sick leave balance must be a positive number'),
  
  body('leaveBalances.emergency')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Emergency leave balance must be a positive number'),
  
  body('leaveBalances.permission')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Permission balance must be a positive number'),
  
  handleValidationErrors
];

module.exports = {
  validateUserRegistration,
  validateUserLogin,
  validateUserUpdate,
  validateLeaveRequest,
  validateLeaveStatusUpdate,
  validateMongoId,
  validateLeaveQuery,
  handleValidationErrors
};