
import { LEAVE_REQUESTS, USERS } from '../constants';
import type { LeaveRequest, User } from '../types';
import { LeaveStatus, UserRole, LeaveType } from '../types';

// Simulate a mutable database by creating copies of the constant data.
let mockLeaveRequests: LeaveRequest[] = JSON.parse(JSON.stringify(LEAVE_REQUESTS));
let mockUsers: User[] = JSON.parse(JSON.stringify(USERS));

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

/**
 * Logs in a user by their email and password.
 * @param email - The user's email.
 * @param password - The user's password.
 * @returns A promise that resolves to the user object or undefined if credentials are invalid.
 */
export const loginUser = async (email: string, password: string): Promise<User | undefined> => {
  await delay(500); // Simulate login delay
  const user = mockUsers.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
  return user ? JSON.parse(JSON.stringify(user)) : undefined;
};


/**
 * Fetches a single user by their ID from the mutable data store.
 * @param userId - The ID of the user to fetch.
 * @returns A promise that resolves to the user object or undefined if not found.
 */
export const getUser = async (userId: number): Promise<User | undefined> => {
  await delay(100); // Simulate network delay
  const user = mockUsers.find(u => u.id === userId);
  return user ? JSON.parse(JSON.stringify(user)) : undefined;
}

/**
 * Fetches all leave requests.
 * @returns A promise that resolves to an array of all leave requests.
 */
export const getAllLeaveRequests = async (): Promise<LeaveRequest[]> => {
  await delay(500); // Simulate network delay
  // Return a deep copy to prevent direct mutation of the mock database
  return JSON.parse(JSON.stringify(mockLeaveRequests));
};

/**
 * Payload for creating a new leave request.
 */
type ApplyLeavePayload = Omit<LeaveRequest, 'id' | 'status' | 'submittedAt' | 'documentUrl'>;

/**
 * Submits a new leave request.
 * @param payload - The leave request data.
 * @returns A promise that resolves to the newly created leave request.
 */
export const applyForLeave = async (payload: ApplyLeavePayload): Promise<LeaveRequest> => {
  await delay(1000); // Simulate network delay

  const userIndex = mockUsers.findIndex(u => u.id === payload.userId);
  if (userIndex === -1) {
    throw new Error("User not found.");
  }
  const applicant = mockUsers[userIndex];

  // --- DEDUCT LEAVE ON APPLICATION ---
  if (payload.leaveType === LeaveType.Permission) {
      const requestedHours = payload.durationHours || 0;
      if (requestedHours <= 0) {
          throw new Error("Permission duration must be greater than 0 hours.");
      }
      if (requestedHours > applicant.leaveBalances.permission) {
          throw new Error(`Insufficient permission balance. Available: ${applicant.leaveBalances.permission} hours.`);
      }
      applicant.leaveBalances.permission -= requestedHours;
      console.log(`Deducted ${requestedHours} hours from ${applicant.name}'s permission balance. New balance: ${applicant.leaveBalances.permission}`);
  } else {
      const startDate = new Date(`${payload.startDate}T00:00:00Z`);
      const endDate = new Date(`${payload.endDate}T00:00:00Z`);
      let requestedDays: number;

      if (payload.isHalfDay) {
          if (payload.startDate !== payload.endDate) {
              throw new Error("Half-day leave must be for a single day.");
          }
          requestedDays = 0.5;
      } else {
          requestedDays = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24) + 1;
      }

      const balanceKey = payload.leaveType.toLowerCase() as keyof Omit<typeof applicant.leaveBalances, 'permission'>;
      const availableBalance = applicant.leaveBalances[balanceKey];

      if (requestedDays > availableBalance) {
          throw new Error(`Insufficient leave balance for ${payload.leaveType}. Available: ${availableBalance} days.`);
      }

      applicant.leaveBalances[balanceKey] -= requestedDays;
      console.log(`Deducted ${requestedDays} days from ${applicant.name}'s ${balanceKey} balance. New balance: ${applicant.leaveBalances[balanceKey]}`);
  }

  
  const manager = mockUsers.find(u => u.id === applicant.managerId);

  let initialStatus: LeaveStatus;
  
  // Determine initial status based on workflow rules
  if (applicant.role === UserRole.Manager) {
      initialStatus = LeaveStatus.PendingHR;
  } else if (applicant.role === UserRole.HR) {
      initialStatus = LeaveStatus.PendingAdmin;
  } else { // Employee or Intern
      if (payload.leaveType === LeaveType.Normal || payload.leaveType === LeaveType.Permission) {
        initialStatus = manager ? LeaveStatus.PendingManager : LeaveStatus.PendingHR;
      } else { // Sick or Emergency leave for Employee goes to HR
        initialStatus = LeaveStatus.PendingHR;
      }
  }

  const newRequest: LeaveRequest = {
    ...payload,
    id: Math.max(0, ...mockLeaveRequests.map(r => r.id)) + 1,
    status: initialStatus,
    submittedAt: new Date().toISOString().split('T')[0],
  };

  mockLeaveRequests.push(newRequest);
  return JSON.parse(JSON.stringify(newRequest));
};

/**
 * Payload for updating the status of a leave request.
 */
interface UpdateStatusPayload {
  requestId: number;
  newStatus: LeaveStatus;
  actor: User;
}

/**
 * Updates the status of an existing leave request.
 * @param payload - The data for the status update.
 * @returns A promise that resolves to the updated leave request.
 */
export const updateLeaveStatus = async ({ requestId, newStatus, actor }: UpdateStatusPayload): Promise<LeaveRequest> => {
    await delay(700);
    
    const requestIndex = mockLeaveRequests.findIndex(r => r.id === requestId);
    if (requestIndex === -1) {
        throw new Error("Leave request not found.");
    }

    const request = mockLeaveRequests[requestIndex];
    let finalStatus = newStatus;
    
    // --- WORKFLOW LOGIC ---
    if (newStatus === LeaveStatus.Approved) {
        // Balance is pre-deducted. This just handles status transitions.
        
        // Employee/Manager Normal Leave Flow (Manager approves, moves to HR)
        if (request.status === LeaveStatus.PendingManager && actor.role === UserRole.Manager) {
            finalStatus = LeaveStatus.PendingHR;
        } 
        // HR approval step
        else if (request.status === LeaveStatus.PendingHR && actor.role === UserRole.HR) {
            const applicant = mockUsers.find(u => u.id === request.userId);
             // If HR applies for themselves, it must go to Admin
            if(applicant?.role === UserRole.HR){
                 finalStatus = LeaveStatus.PendingAdmin;
            } else {
                 // HR gives final approval for Employees, Managers, etc.
                 finalStatus = LeaveStatus.Approved;
            }
        } 
        // Admin final approval step
        else if (request.status === LeaveStatus.PendingAdmin && actor.role === UserRole.Admin) {
            finalStatus = LeaveStatus.Approved;
        } 
        // Allow Admin to override and approve anything
        else if (actor.role === UserRole.Admin) {
             finalStatus = LeaveStatus.Approved;
        }

    } else if (newStatus === LeaveStatus.Rejected) {
        // Rejection at any stage is final.
        finalStatus = LeaveStatus.Rejected;

        // --- BALANCE REVOKE LOGIC ---
        // Add the deducted leave days back to the user's balance.
        const userIndex = mockUsers.findIndex(u => u.id === request.userId);
        if (userIndex !== -1) {
            const user = mockUsers[userIndex];
            
            if (request.leaveType === LeaveType.Permission) {
                const hoursToRevoke = request.durationHours || 0;
                user.leaveBalances.permission += hoursToRevoke;
                 console.log(`Revoked ${hoursToRevoke} hours for ${user.name}'s rejected permission request. New balance: ${user.leaveBalances.permission}`);

            } else {
                let daysToRevoke: number;
                if (request.isHalfDay) {
                    daysToRevoke = 0.5;
                } else {
                    const startDate = new Date(`${request.startDate}T00:00:00Z`);
                    const endDate = new Date(`${request.endDate}T00:00:00Z`);
                    daysToRevoke = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24) + 1;
                }
                const balanceKey = request.leaveType.toLowerCase() as keyof Omit<typeof user.leaveBalances, 'permission'>;
                user.leaveBalances[balanceKey] += daysToRevoke;
                console.log(`Revoked ${daysToRevoke} days for ${user.name}'s rejected ${balanceKey} request. New balance: ${user.leaveBalances[balanceKey]}`);
            }

        } else {
             console.error("User not found for balance revoke!");
        }
    }
    
    mockLeaveRequests[requestIndex] = { ...request, status: finalStatus };
    return JSON.parse(JSON.stringify(mockLeaveRequests[requestIndex]));
};
