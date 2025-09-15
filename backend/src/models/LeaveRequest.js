const mongoose = require('mongoose');

const leaveRequestSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  leaveType: {
    type: String,
    enum: ['Normal', 'Sick', 'Emergency', 'Permission'],
    required: [true, 'Leave type is required']
  },
  startDate: {
    type: Date,
    required: [true, 'Start date is required']
  },
  endDate: {
    type: Date,
    required: [true, 'End date is required']
  },
  reason: {
    type: String,
    required: [true, 'Reason is required'],
    trim: true,
    maxlength: [500, 'Reason cannot exceed 500 characters']
  },
  status: {
    type: String,
    enum: [
      'Pending Manager Approval',
      'Pending HR Approval', 
      'Pending Admin Approval',
      'Approved',
      'Rejected',
      'Cancelled'
    ],
    default: 'Pending Manager Approval'
  },
  isHalfDay: {
    type: Boolean,
    default: false
  },
  durationHours: {
    type: Number,
    min: [0, 'Duration hours cannot be negative'],
    validate: {
      validator: function(value) {
        // durationHours is required only for Permission type leaves
        if (this.leaveType === 'Permission') {
          return value && value > 0;
        }
        return true;
      },
      message: 'Duration hours is required for Permission type leaves'
    }
  },
  documentUrl: {
    type: String,
    default: null
  },
  approvalHistory: [{
    approver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    action: {
      type: String,
      enum: ['Approved', 'Rejected', 'Submitted']
    },
    comments: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  submittedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better performance
leaveRequestSchema.index({ userId: 1, startDate: -1 });
leaveRequestSchema.index({ status: 1 });
leaveRequestSchema.index({ leaveType: 1 });
leaveRequestSchema.index({ startDate: 1, endDate: 1 });

// Virtual for applicant information
leaveRequestSchema.virtual('applicant', {
  ref: 'User',
  localField: 'userId',
  foreignField: '_id',
  justOne: true
});

// Validate date logic
leaveRequestSchema.pre('validate', function(next) {
  // Ensure end date is not before start date
  if (this.startDate && this.endDate && this.endDate < this.startDate) {
    this.invalidate('endDate', 'End date cannot be before start date');
  }
  
  // For half-day leaves, start and end date should be same
  if (this.isHalfDay && this.startDate && this.endDate) {
    const start = new Date(this.startDate).toDateString();
    const end = new Date(this.endDate).toDateString();
    if (start !== end) {
      this.invalidate('endDate', 'Half-day leave must have same start and end date');
    }
  }
  
  // For Permission type, start and end date should be same
  if (this.leaveType === 'Permission' && this.startDate && this.endDate) {
    const start = new Date(this.startDate).toDateString();
    const end = new Date(this.endDate).toDateString();
    if (start !== end) {
      this.endDate = this.startDate;
    }
  }
  
  next();
});

// Method to calculate leave duration in days
leaveRequestSchema.methods.calculateDurationDays = function() {
  if (this.leaveType === 'Permission') {
    return 0; // Permission is measured in hours
  }
  
  if (this.isHalfDay) {
    return 0.5;
  }
  
  const start = new Date(this.startDate);
  const end = new Date(this.endDate);
  const timeDiff = end.getTime() - start.getTime();
  return Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1; // +1 to include both start and end dates
};

// Transform output to match frontend format
leaveRequestSchema.methods.toJSON = function() {
  const leave = this.toObject();
  
  // Convert MongoDB _id to id for frontend compatibility
  leave.id = leave._id.toString();
  delete leave._id;
  delete leave.__v;
  
  // Convert userId ObjectId to number (you might need a mapping system)
  if (leave.userId) {
    // For now, we'll keep the ObjectId string
    // In production, you might want to maintain an ID mapping system
  }
  
  // Format dates to match frontend format (YYYY-MM-DD)
  if (leave.startDate) {
    leave.startDate = new Date(leave.startDate).toISOString().split('T')[0];
  }
  if (leave.endDate) {
    leave.endDate = new Date(leave.endDate).toISOString().split('T')[0];
  }
  if (leave.submittedAt) {
    leave.submittedAt = new Date(leave.submittedAt).toISOString().split('T')[0];
  }
  
  return leave;
};

// Static method to get next approval level
leaveRequestSchema.statics.getNextApprovalStatus = function(currentStatus, approverRole) {
  const approvalFlow = {
    'Pending Manager Approval': {
      'Manager': 'Pending HR Approval',
      'HR': 'Pending HR Approval', // Skip manager if HR approves directly
      'Admin': 'Approved' // Admin can override
    },
    'Pending HR Approval': {
      'HR': 'Approved', // HR final approval for most cases
      'Admin': 'Approved'
    },
    'Pending Admin Approval': {
      'Admin': 'Approved'
    }
  };
  
  return approvalFlow[currentStatus]?.[approverRole] || currentStatus;
};

module.exports = mongoose.model('LeaveRequest', leaveRequestSchema);