const User = require('../models/User');
const LeaveRequest = require('../models/LeaveRequest');
const connectDB = require('../config/database');
require('dotenv').config();

const users = [
  {
    name: 'Adam Admin',
    email: 'adam.admin@example.com',
    password: 'admin123',
    role: 'Admin',
    leaveBalances: { normal: 0, sick: 0, emergency: 0, permission: 0 }
  },
  {
    name: 'Hannah HR',
    email: 'hannah.hr@example.com',
    password: 'hr123',
    role: 'HR',
    leaveBalances: { normal: 18, sick: 8, emergency: 4, permission: 24 }
  },
  {
    name: 'Frank Fullstack',
    email: 'frank.fullstack@example.com',
    password: 'manager123',
    role: 'Manager',
    leaveBalances: { normal: 15, sick: 10, emergency: 5, permission: 24 }
  },
  {
    name: 'Diana DataSci',
    email: 'diana.datasci@example.com',
    password: 'manager123',
    role: 'Manager',
    leaveBalances: { normal: 15, sick: 10, emergency: 5, permission: 24 }
  },
  {
    name: 'Ursula UX',
    email: 'ursula.ux@example.com',
    password: 'manager123',
    role: 'Manager',
    leaveBalances: { normal: 15, sick: 10, emergency: 5, permission: 24 }
  },
  {
    name: 'Eddie Engineer',
    email: 'eddie.engineer@example.com',
    password: 'employee123',
    role: 'Employee',
    leaveBalances: { normal: 12, sick: 7, emergency: 3, permission: 16 }
  },
  {
    name: 'Anna Analyst',
    email: 'anna.analyst@example.com',
    password: 'employee123',
    role: 'Employee',
    leaveBalances: { normal: 20, sick: 5, emergency: 5, permission: 16 }
  },
  {
    name: 'Desi Designer',
    email: 'desi.designer@example.com',
    password: 'employee123',
    role: 'Employee',
    leaveBalances: { normal: 10, sick: 8, emergency: 2, permission: 16 }
  }
];

const seedDatabase = async () => {
  try {
    await connectDB();
    console.log('🔄 Seeding database...');

    // Clear existing data
    await User.deleteMany({});
    await LeaveRequest.deleteMany({});
    console.log('🧹 Cleared existing data');

    // Create users
    const createdUsers = [];
    for (const userData of users) {
      const user = await User.create(userData);
      createdUsers.push(user);
      console.log(`👤 Created user: ${user.name} (${user.role})`);
    }

    // Set up manager relationships
    const adminUser = createdUsers.find(u => u.role === 'Admin');
    const hrUser = createdUsers.find(u => u.role === 'HR');
    const managers = createdUsers.filter(u => u.role === 'Manager');
    const employees = createdUsers.filter(u => u.role === 'Employee');

    // HR reports to Admin
    hrUser.managerId = adminUser._id;
    await hrUser.save();

    // Managers report to HR
    for (const manager of managers) {
      manager.managerId = hrUser._id;
      await manager.save();
    }

    // Employees report to specific managers
    employees[0].managerId = managers[0]._id; // Eddie -> Frank
    employees[1].managerId = managers[1]._id; // Anna -> Diana
    employees[2].managerId = managers[2]._id; // Desi -> Ursula

    for (const employee of employees) {
      await employee.save();
    }

    console.log('🔗 Set up manager relationships');

    // Create sample leave requests
    const sampleLeaveRequests = [
      {
        userId: employees[0]._id, // Eddie Engineer
        leaveType: 'Normal',
        startDate: new Date('2024-08-15'),
        endDate: new Date('2024-08-16'),
        reason: 'Family vacation',
        status: 'Pending Manager Approval',
        submittedAt: new Date('2024-07-20')
      },
      {
        userId: employees[0]._id, // Eddie Engineer
        leaveType: 'Sick',
        startDate: new Date('2024-06-10'),
        endDate: new Date('2024-06-10'),
        reason: 'Doctor appointment',
        status: 'Approved',
        submittedAt: new Date('2024-06-08')
      },
      {
        userId: employees[1]._id, // Anna Analyst
        leaveType: 'Sick',
        startDate: new Date('2024-07-28'),
        endDate: new Date('2024-07-28'),
        reason: 'Flu',
        status: 'Pending Manager Approval',
        submittedAt: new Date('2024-07-28')
      },
      {
        userId: employees[1]._id, // Anna Analyst
        leaveType: 'Permission',
        startDate: new Date('2024-08-12'),
        endDate: new Date('2024-08-12'),
        reason: 'Bank appointment',
        status: 'Approved',
        submittedAt: new Date('2024-08-09'),
        durationHours: 2
      },
      {
        userId: employees[2]._id, // Desi Designer
        leaveType: 'Sick',
        startDate: new Date('2024-08-10'),
        endDate: new Date('2024-08-10'),
        reason: 'Migraine',
        status: 'Pending HR Approval',
        submittedAt: new Date('2024-08-09'),
        isHalfDay: true
      },
      {
        userId: managers[0]._id, // Frank Fullstack
        leaveType: 'Normal',
        startDate: new Date('2024-09-01'),
        endDate: new Date('2024-09-05'),
        reason: 'Attending Full Stack Conference',
        status: 'Pending HR Approval',
        submittedAt: new Date('2024-07-15')
      },
      {
        userId: hrUser._id, // Hannah HR
        leaveType: 'Normal',
        startDate: new Date('2024-08-20'),
        endDate: new Date('2024-08-22'),
        reason: 'Personal time',
        status: 'Pending Admin Approval',
        submittedAt: new Date('2024-07-18')
      }
    ];

    for (const leaveData of sampleLeaveRequests) {
      const leave = await LeaveRequest.create(leaveData);
      console.log(`📋 Created leave request: ${leave._id} for ${leave.leaveType}`);
    }

    console.log('✅ Database seeded successfully!');
    console.log('\n📋 Test Credentials:');
    console.log('Admin: adam.admin@example.com / admin123');
    console.log('HR: hannah.hr@example.com / hr123');
    console.log('Manager: frank.fullstack@example.com / manager123');
    console.log('Employee: eddie.engineer@example.com / employee123');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
};

// Run seeding if this file is executed directly
if (require.main === module) {
  seedDatabase();
}

module.exports = seedDatabase;