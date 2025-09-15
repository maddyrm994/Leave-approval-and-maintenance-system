const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware to protect routes
const protect = async (req, res, next) => {
  let token;

  // Check for token in Authorization header
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. No token provided.'
    });
  }

  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Get user from token
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Token is valid but user no longer exists'
      });
    }

    if (!user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'User account is deactivated'
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(401).json({
      success: false,
      message: 'Invalid token'
    });
  }
};

// Middleware to restrict access to specific roles
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. Please authenticate first.'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Role '${req.user.role}' is not authorized to access this resource.`
      });
    }

    next();
  };
};

// Middleware to check if user is accessing their own data or is authorized
const authorizeOwnerOrRole = (...authorizedRoles) => {
  return (req, res, next) => {
    const resourceUserId = req.params.userId || req.params.id;
    const currentUserId = req.user._id.toString();
    
    // Allow if user is accessing their own data
    if (resourceUserId === currentUserId) {
      return next();
    }
    
    // Allow if user has authorized role
    if (authorizedRoles.includes(req.user.role)) {
      return next();
    }
    
    // For managers, allow access to their team members' data
    if (req.user.role === 'Manager') {
      // This would require additional logic to check if the resource belongs to team member
      // For now, we'll allow manager access
      return next();
    }
    
    return res.status(403).json({
      success: false,
      message: 'Access denied. You can only access your own data or you lack sufficient permissions.'
    });
  };
};

// Generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '24h'
  });
};

module.exports = {
  protect,
  authorize,
  authorizeOwnerOrRole,
  generateToken
};