import { UserRole, LeaveType, LeaveStatus } from './types';
import type { User, LeaveRequest } from './types';

export const USERS: User[] = [
  // Core Roles
  { id: 1, name: 'Adam Admin', role: UserRole.Admin, email: 'adam.admin@example.com', password: 'admin', leaveBalances: { normal: 0, sick: 0, emergency: 0, permission: 0 } },
  { id: 2, name: 'Hannah HR', role: UserRole.HR, email: 'hannah.hr@example.com', managerId: 1, password: 'hr', leaveBalances: { normal: 18, sick: 8, emergency: 4, permission: 24 } },
  
  // Domain Managers
  { id: 3, name: 'Frank Fullstack', role: UserRole.Manager, email: 'frank.fullstack@example.com', managerId: 2, password: 'manager', leaveBalances: { normal: 15, sick: 10, emergency: 5, permission: 24 } },
  { id: 4, name: 'Diana DataSci', role: UserRole.Manager, email: 'diana.datasci@example.com', managerId: 2, password: 'manager', leaveBalances: { normal: 15, sick: 10, emergency: 5, permission: 24 } },
  { id: 5, name: 'Ursula UX', role: UserRole.Manager, email: 'ursula.ux@example.com', managerId: 2, password: 'manager', leaveBalances: { normal: 15, sick: 10, emergency: 5, permission: 24 } },

  // Employees reporting to specific managers
  { id: 6, name: 'Eddie Engineer', role: UserRole.Employee, email: 'eddie.engineer@example.com', managerId: 3, password: 'employee', leaveBalances: { normal: 12, sick: 7, emergency: 3, permission: 16 } },
  { id: 7, name: 'Anna Analyst', role: UserRole.Employee, email: 'anna.analyst@example.com', managerId: 4, password: 'employee', leaveBalances: { normal: 20, sick: 5, emergency: 5, permission: 16 } },
  { id: 8, name: 'Desi Designer', role: UserRole.Employee, email: 'desi.designer@example.com', managerId: 5, password: 'employee', leaveBalances: { normal: 10, sick: 8, emergency: 2, permission: 16 } },
];

export const LEAVE_REQUESTS: LeaveRequest[] = [
  // Requests for Eddie Engineer (reports to Frank Fullstack)
  { id: 1, userId: 6, leaveType: LeaveType.Normal, startDate: '2024-08-15', endDate: '2024-08-16', reason: 'Family vacation', status: LeaveStatus.PendingManager, submittedAt: '2024-07-20' },
  { id: 2, userId: 6, leaveType: LeaveType.Sick, startDate: '2024-06-10', endDate: '2024-06-10', reason: 'Doctor appointment', status: LeaveStatus.Approved, submittedAt: '2024-06-08' },

  // Requests for Anna Analyst (reports to Diana DataSci)
  { id: 3, userId: 7, leaveType: LeaveType.Sick, startDate: '2024-07-28', endDate: '2024-07-28', reason: 'Flu', status: LeaveStatus.PendingManager, submittedAt: '2024-07-28' },
  { id: 4, userId: 7, leaveType: LeaveType.Permission, startDate: '2024-08-12', endDate: '2024-08-12', reason: 'Bank appointment', status: LeaveStatus.Approved, submittedAt: '2024-08-09', durationHours: 2 },
  { id: 10, userId: 7, leaveType: LeaveType.Normal, startDate: '2024-05-01', endDate: '2024-05-02', reason: 'Personal time', status: LeaveStatus.Rejected, submittedAt: '2024-04-20' },

  // Requests for Desi Designer (reports to Ursula UX)
  { id: 5, userId: 8, leaveType: LeaveType.Sick, startDate: '2024-08-10', endDate: '2024-08-10', reason: 'Migraine', status: LeaveStatus.PendingHR, submittedAt: '2024-08-09', isHalfDay: true },
  { id: 6, userId: 8, leaveType: LeaveType.Emergency, startDate: '2024-07-29', endDate: '2024-07-30', reason: 'Family emergency', status: LeaveStatus.Approved, submittedAt: '2024-07-29' },

  // Requests from Managers (report to HR)
  { id: 7, userId: 3, leaveType: LeaveType.Normal, startDate: '2024-09-01', endDate: '2024-09-05', reason: 'Attending Full Stack Conference', status: LeaveStatus.PendingHR, submittedAt: '2024-07-15' },
  { id: 8, userId: 4, leaveType: LeaveType.Normal, startDate: '2024-09-10', endDate: '2024-09-12', reason: 'Data Science Summit', status: LeaveStatus.Approved, submittedAt: '2024-07-16' },

  // Request from HR (reports to Admin)
  { id: 9, userId: 2, leaveType: LeaveType.Normal, startDate: '2024-08-20', endDate: '2024-08-22', reason: 'Personal time', status: LeaveStatus.PendingAdmin, submittedAt: '2024-07-18' },
];
