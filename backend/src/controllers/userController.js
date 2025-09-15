const User = require('../models/User');
const LeaveRequest = require('../models/LeaveRequest');

// @desc    Get all users
// @route   GET /api/users
// @access  Private (HR, Admin)
const getUsers = async (req, res) => {
  try {
    const { page = 1, limit = 50, role, search } = req.query;
    
    // Build query
    let query = { isActive: true };
    
    if (role) {
      query.role = role;
    }
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    // Execute query with pagination
    const users = await User.find(query)
      .populate('manager', 'name email role')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await User.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        users: users.map(user => user.toJSON()),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users',
      error: error.message
    });
  }
};

// @desc    Get single user
// @route   GET /api/users/:id
// @access  Private
const getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .populate('manager', 'name email role')
      .populate('teamMembers', 'name email role');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        user: user.toJSON()
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user',
      error: error.message
    });
  }
};

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private (HR, Admin, or own profile)
const updateUser = async (req, res) => {
  try {
    const { name, email, role, leaveBalances, managerId, isActive } = req.body;
    
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Only allow certain fields to be updated by different roles
    const allowedUpdates = {};
    
    if (name) allowedUpdates.name = name;
    if (email) allowedUpdates.email = email;
    
    // Only HR and Admin can update role and leave balances
    if (['HR', 'Admin'].includes(req.user.role)) {
      if (role) allowedUpdates.role = role;
      if (leaveBalances) allowedUpdates.leaveBalances = { ...user.leaveBalances, ...leaveBalances };
      if (managerId !== undefined) allowedUpdates.managerId = managerId;
      if (isActive !== undefined) allowedUpdates.isActive = isActive;
    }

    // Update user
    const updatedUser = await User.findByIdAndUpdate(
      req.params.id,
      allowedUpdates,
      { new: true, runValidators: true }
    ).populate('manager', 'name email role');

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: {
        user: updatedUser.toJSON()
      }
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user',
      error: error.message
    });
  }
};

// @desc    Delete user (soft delete)
// @route   DELETE /api/users/:id
// @access  Private (Admin only)
const deleteUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Soft delete by setting isActive to false
    user.isActive = false;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'User deactivated successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete user',
      error: error.message
    });
  }
};

// @desc    Get team members (for managers)
// @route   GET /api/users/team
// @access  Private (Manager, HR, Admin)
const getTeamMembers = async (req, res) => {
  try {
    let teamMembers;

    if (req.user.role === 'Manager') {
      // Get direct reports
      teamMembers = await User.find({ managerId: req.user._id, isActive: true })
        .select('-password')
        .sort({ name: 1 });
    } else if (['HR', 'Admin'].includes(req.user.role)) {
      // HR and Admin can see all users
      teamMembers = await User.find({ isActive: true })
        .select('-password')
        .populate('manager', 'name email role')
        .sort({ name: 1 });
    } else {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only managers, HR, and admins can view team members.'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        teamMembers: teamMembers.map(user => user.toJSON())
      }
    });
  } catch (error) {
    console.error('Get team members error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch team members',
      error: error.message
    });
  }
};

// @desc    Get user dashboard stats
// @route   GET /api/users/:id/stats
// @access  Private
const getUserStats = async (req, res) => {
  try {
    const userId = req.params.id;
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get leave statistics
    const currentYear = new Date().getFullYear();
    const leaveStats = await LeaveRequest.aggregate([
      {
        $match: {
          userId: user._id,
          startDate: {
            $gte: new Date(`${currentYear}-01-01`),
            $lte: new Date(`${currentYear}-12-31`)
          }
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    // Calculate total days taken
    const approvedLeaves = await LeaveRequest.find({
      userId: user._id,
      status: 'Approved',
      startDate: {
        $gte: new Date(`${currentYear}-01-01`),
        $lte: new Date(`${currentYear}-12-31`)
      }
    });

    let totalDaysTaken = 0;
    approvedLeaves.forEach(leave => {
      if (leave.leaveType === 'Permission') {
        // Permission is in hours, not counted in days
        return;
      }
      if (leave.isHalfDay) {
        totalDaysTaken += 0.5;
      } else {
        const days = leave.calculateDurationDays();
        totalDaysTaken += days;
      }
    });

    const stats = {
      leaveBalances: user.leaveBalances,
      totalDaysTaken,
      leaveRequestStats: leaveStats.reduce((acc, stat) => {
        acc[stat._id] = stat.count;
        return acc;
      }, {}),
      currentYear
    };

    res.status(200).json({
      success: true,
      data: { stats }
    });
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user statistics',
      error: error.message
    });
  }
};

module.exports = {
  getUsers,
  getUser,
  updateUser,
  deleteUser,
  getTeamMembers,
  getUserStats
};