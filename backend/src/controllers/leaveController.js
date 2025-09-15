const LeaveRequest = require('../models/LeaveRequest');
const User = require('../models/User');

// @desc    Create new leave request
// @route   POST /api/leaves
// @access  Private
const createLeaveRequest = async (req, res) => {
  try {
    const { leaveType, startDate, endDate, reason, isHalfDay, durationHours } = req.body;
    const userId = req.user._id;

    // Get user with current balances
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Calculate required leave balance and validate
    let requiredBalance = 0;
    let balanceType = '';

    if (leaveType === 'Permission') {
      requiredBalance = durationHours || 0;
      balanceType = 'permission';
      
      if (requiredBalance <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Permission duration must be greater than 0 hours'
        });
      }
    } else {
      balanceType = leaveType.toLowerCase();
      
      if (isHalfDay) {
        if (startDate !== endDate) {
          return res.status(400).json({
            success: false,
            message: 'Half-day leave must be for a single day'
          });
        }
        requiredBalance = 0.5;
      } else {
        const start = new Date(startDate);
        const end = new Date(endDate);
        requiredBalance = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
      }
    }

    // Check if user has sufficient balance
    const currentBalance = user.leaveBalances[balanceType];
    if (currentBalance < requiredBalance) {
      return res.status(400).json({
        success: false,
        message: `Insufficient ${balanceType} leave balance. Available: ${currentBalance} ${balanceType === 'permission' ? 'hours' : 'days'}`
      });
    }

    // Determine initial status based on user role and leave type
    let initialStatus = 'Pending Manager Approval';
    
    if (user.role === 'Manager') {
      initialStatus = 'Pending HR Approval';
    } else if (user.role === 'HR') {
      initialStatus = 'Pending Admin Approval';
    } else {
      // For employees, sick and emergency leave go directly to HR
      if (['Sick', 'Emergency'].includes(leaveType)) {
        initialStatus = 'Pending HR Approval';
      } else if (!user.managerId) {
        // If no manager assigned, go to HR
        initialStatus = 'Pending HR Approval';
      }
    }

    // Create leave request
    const leaveRequest = await LeaveRequest.create({
      userId,
      leaveType,
      startDate,
      endDate: leaveType === 'Permission' ? startDate : endDate,
      reason,
      status: initialStatus,
      isHalfDay: leaveType !== 'Permission' ? isHalfDay : false,
      durationHours: leaveType === 'Permission' ? durationHours : undefined,
      approvalHistory: [{
        action: 'Submitted',
        timestamp: new Date()
      }]
    });

    // Deduct from user's leave balance immediately
    user.leaveBalances[balanceType] -= requiredBalance;
    await user.save();

    // Populate user info for response
    await leaveRequest.populate('applicant', 'name email role');

    res.status(201).json({
      success: true,
      message: 'Leave request submitted successfully',
      data: {
        leaveRequest: leaveRequest.toJSON()
      }
    });
  } catch (error) {
    console.error('Create leave request error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create leave request',
      error: error.message
    });
  }
};

// @desc    Get leave requests
// @route   GET /api/leaves
// @access  Private
const getLeaveRequests = async (req, res) => {
  try {
    const { status, leaveType, startDate, endDate, userId, page = 1, limit = 50 } = req.query;
    
    // Build query based on user role
    let query = {};
    
    if (req.user.role === 'Employee') {
      // Employees can only see their own requests
      query.userId = req.user._id;
    } else if (req.user.role === 'Manager') {
      // Managers can see their team's requests + their own
      const teamMembers = await User.find({ managerId: req.user._id }).select('_id');
      const teamIds = teamMembers.map(member => member._id);
      teamIds.push(req.user._id); // Include manager's own requests
      query.userId = { $in: teamIds };
    }
    // HR and Admin can see all requests (no additional query restrictions)

    // Apply filters
    if (status) query.status = status;
    if (leaveType) query.leaveType = leaveType;
    if (userId) query.userId = userId;
    if (startDate || endDate) {
      query.startDate = {};
      if (startDate) query.startDate.$gte = new Date(startDate);
      if (endDate) query.startDate.$lte = new Date(endDate);
    }

    // Execute query
    const leaveRequests = await LeaveRequest.find(query)
      .populate('applicant', 'name email role managerId')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await LeaveRequest.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        leaveRequests: leaveRequests.map(request => request.toJSON()),
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    console.error('Get leave requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch leave requests',
      error: error.message
    });
  }
};

// @desc    Get actionable leave requests (pending approval)
// @route   GET /api/leaves/actionable
// @access  Private (Manager, HR, Admin)
const getActionableRequests = async (req, res) => {
  try {
    let query = {};

    if (req.user.role === 'Manager') {
      // Get team members' requests pending manager approval
      const teamMembers = await User.find({ managerId: req.user._id }).select('_id');
      const teamIds = teamMembers.map(member => member._id);
      
      query = {
        userId: { $in: teamIds },
        status: 'Pending Manager Approval'
      };
    } else if (req.user.role === 'HR') {
      query = {
        status: { $in: ['Pending HR Approval', 'Pending Manager Approval'] }
      };
    } else if (req.user.role === 'Admin') {
      query = {
        status: { $in: ['Pending Admin Approval', 'Pending HR Approval'] }
      };
    } else {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Only managers, HR, and admins can view actionable requests.'
      });
    }

    const actionableRequests = await LeaveRequest.find(query)
      .populate('applicant', 'name email role managerId')
      .sort({ createdAt: 1 }); // Oldest first for action queue

    res.status(200).json({
      success: true,
      data: {
        actionableRequests: actionableRequests.map(request => request.toJSON())
      }
    });
  } catch (error) {
    console.error('Get actionable requests error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch actionable requests',
      error: error.message
    });
  }
};

// @desc    Get single leave request
// @route   GET /api/leaves/:id
// @access  Private
const getLeaveRequest = async (req, res) => {
  try {
    const leaveRequest = await LeaveRequest.findById(req.params.id)
      .populate('applicant', 'name email role managerId')
      .populate('approvalHistory.approver', 'name email role');

    if (!leaveRequest) {
      return res.status(404).json({
        success: false,
        message: 'Leave request not found'
      });
    }

    // Check permissions
    if (req.user.role === 'Employee' && !leaveRequest.userId.equals(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only view your own leave requests.'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        leaveRequest: leaveRequest.toJSON()
      }
    });
  } catch (error) {
    console.error('Get leave request error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch leave request',
      error: error.message
    });
  }
};

// @desc    Update leave request status
// @route   PUT /api/leaves/:id/status
// @access  Private (Manager, HR, Admin)
const updateLeaveStatus = async (req, res) => {
  try {
    const { status, comments } = req.body;
    const leaveRequest = await LeaveRequest.findById(req.params.id)
      .populate('applicant', 'name email role managerId');

    if (!leaveRequest) {
      return res.status(404).json({
        success: false,
        message: 'Leave request not found'
      });
    }

    // Check permissions and workflow
    const canApprove = canUserApproveRequest(req.user, leaveRequest);
    if (!canApprove.allowed) {
      return res.status(403).json({
        success: false,
        message: canApprove.message
      });
    }

    let finalStatus = status;

    // Handle approval workflow
    if (status === 'Approved') {
      finalStatus = LeaveRequest.getNextApprovalStatus(leaveRequest.status, req.user.role);
    } else if (status === 'Rejected') {
      // Rejection is final, restore user's leave balance
      await restoreLeaveBalance(leaveRequest);
    }

    // Update leave request
    leaveRequest.status = finalStatus;
    leaveRequest.approvalHistory.push({
      approver: req.user._id,
      action: status === 'Approved' ? 'Approved' : 'Rejected',
      comments: comments || '',
      timestamp: new Date()
    });

    await leaveRequest.save();

    res.status(200).json({
      success: true,
      message: `Leave request ${status.toLowerCase()} successfully`,
      data: {
        leaveRequest: leaveRequest.toJSON()
      }
    });
  } catch (error) {
    console.error('Update leave status error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update leave request status',
      error: error.message
    });
  }
};

// @desc    Cancel leave request
// @route   PUT /api/leaves/:id/cancel
// @access  Private (Owner only)
const cancelLeaveRequest = async (req, res) => {
  try {
    const leaveRequest = await LeaveRequest.findById(req.params.id);

    if (!leaveRequest) {
      return res.status(404).json({
        success: false,
        message: 'Leave request not found'
      });
    }

    // Check if user owns this request
    if (!leaveRequest.userId.equals(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'You can only cancel your own leave requests'
      });
    }

    // Check if request can be cancelled
    if (['Approved', 'Rejected', 'Cancelled'].includes(leaveRequest.status)) {
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel a request that is already approved, rejected, or cancelled'
      });
    }

    // Restore leave balance
    await restoreLeaveBalance(leaveRequest);

    // Update status
    leaveRequest.status = 'Cancelled';
    leaveRequest.approvalHistory.push({
      action: 'Cancelled',
      comments: 'Cancelled by applicant',
      timestamp: new Date()
    });

    await leaveRequest.save();

    res.status(200).json({
      success: true,
      message: 'Leave request cancelled successfully',
      data: {
        leaveRequest: leaveRequest.toJSON()
      }
    });
  } catch (error) {
    console.error('Cancel leave request error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to cancel leave request',
      error: error.message
    });
  }
};

// Helper function to check if user can approve a request
const canUserApproveRequest = (user, leaveRequest) => {
  const { role } = user;
  const { status } = leaveRequest;

  if (role === 'Employee') {
    return { allowed: false, message: 'Employees cannot approve leave requests' };
  }

  if (role === 'Manager') {
    if (status !== 'Pending Manager Approval') {
      return { allowed: false, message: 'This request is not pending manager approval' };
    }
    // Check if this is their team member
    // Additional logic could be added here to verify team membership
  }

  if (role === 'HR') {
    if (!['Pending HR Approval', 'Pending Manager Approval'].includes(status)) {
      return { allowed: false, message: 'This request is not pending HR approval' };
    }
  }

  if (role === 'Admin') {
    // Admin can approve any request at any stage
    return { allowed: true };
  }

  return { allowed: true };
};

// Helper function to restore leave balance when request is rejected/cancelled
const restoreLeaveBalance = async (leaveRequest) => {
  try {
    const user = await User.findById(leaveRequest.userId);
    if (!user) return;

    let balanceToRestore = 0;
    let balanceType = '';

    if (leaveRequest.leaveType === 'Permission') {
      balanceToRestore = leaveRequest.durationHours || 0;
      balanceType = 'permission';
    } else {
      balanceType = leaveRequest.leaveType.toLowerCase();
      
      if (leaveRequest.isHalfDay) {
        balanceToRestore = 0.5;
      } else {
        balanceToRestore = leaveRequest.calculateDurationDays();
      }
    }

    user.leaveBalances[balanceType] += balanceToRestore;
    await user.save();
  } catch (error) {
    console.error('Error restoring leave balance:', error);
  }
};

module.exports = {
  createLeaveRequest,
  getLeaveRequests,
  getActionableRequests,
  getLeaveRequest,
  updateLeaveStatus,
  cancelLeaveRequest
};