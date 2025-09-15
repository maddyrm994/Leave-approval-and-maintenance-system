const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters']
  },
  role: {
    type: String,
    enum: ['Employee', 'Manager', 'HR', 'Admin'],
    default: 'Employee'
  },
  managerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  leaveBalances: {
    normal: {
      type: Number,
      default: 20,
      min: [0, 'Leave balance cannot be negative']
    },
    sick: {
      type: Number,
      default: 10,
      min: [0, 'Leave balance cannot be negative']
    },
    emergency: {
      type: Number,
      default: 5,
      min: [0, 'Leave balance cannot be negative']
    },
    permission: {
      type: Number,
      default: 20,
      min: [0, 'Leave balance cannot be negative']
    }
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index for faster queries
userSchema.index({ email: 1 });
userSchema.index({ role: 1 });
userSchema.index({ managerId: 1 });

// Virtual for manager information
userSchema.virtual('manager', {
  ref: 'User',
  localField: 'managerId',
  foreignField: '_id',
  justOne: true
});

// Virtual for team members (for managers)
userSchema.virtual('teamMembers', {
  ref: 'User',
  localField: '_id',
  foreignField: 'managerId'
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  // Only hash if password is modified
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Transform output to match frontend format
userSchema.methods.toJSON = function() {
  const user = this.toObject();
  
  // Convert MongoDB _id to id for frontend compatibility
  user.id = user._id.toString();
  delete user._id;
  delete user.__v;
  delete user.password; // Never send password to frontend
  
  // Convert managerId to managerId number if exists
  if (user.managerId) {
    // For demo purposes, we can create a mapping or keep ObjectId
    // You might want to maintain a separate ID mapping system
  }
  
  return user;
};

// Static method to get default leave balances by role
userSchema.statics.getDefaultLeaveBalances = function(role) {
  switch (role) {
    case 'Admin':
      return { normal: 0, sick: 0, emergency: 0, permission: 0 };
    case 'HR':
      return { normal: 25, sick: 12, emergency: 5, permission: 30 };
    case 'Manager':
      return { normal: 22, sick: 10, emergency: 5, permission: 25 };
    case 'Employee':
    default:
      return { normal: 20, sick: 10, emergency: 3, permission: 20 };
  }
};

module.exports = mongoose.model('User', userSchema);