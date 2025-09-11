
export enum UserRole {
  Employee = 'Employee',
  Manager = 'Manager',
  HR = 'HR',
  Admin = 'Admin',
}

export enum LeaveType {
  Normal = 'Normal',
  Sick = 'Sick',
  Emergency = 'Emergency',
  Permission = 'Permission',
}

export enum LeaveStatus {
  PendingManager = 'Pending Manager Approval',
  PendingHR = 'Pending HR Approval',
  PendingAdmin = 'Pending Admin Approval',
  Approved = 'Approved',
  Rejected = 'Rejected',
  Cancelled = 'Cancelled',
}

export interface User {
  id: number;
  name: string;
  role: UserRole;
  password?: string;
  managerId?: number;
  email: string;
  leaveBalances: {
    normal: number;
    sick: number;
    emergency: number;
    permission: number; // In hours
  };
}

export interface LeaveRequest {
  id: number;
  userId: number;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  reason: string;
  status: LeaveStatus;
  submittedAt: string;
  documentUrl?: string;
  isHalfDay?: boolean;
  durationHours?: number;
}
