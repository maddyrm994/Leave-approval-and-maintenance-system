import type { LeaveRequest, User } from '../types';
import { LeaveStatus, UserRole, LeaveType } from '../types';

// Backend base URL
const BASE_URL = 'http://localhost:5000/api';

// --- AUTH ---
export const loginUser = async (email: string, password: string): Promise<User | undefined> => {
  const res = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
    credentials: 'include'
  });
  if (!res.ok) return undefined;
  return await res.json();
};

// --- USERS ---
export const getUser = async (userId: number): Promise<User | undefined> => {
  const res = await fetch(`${BASE_URL}/users/${userId}`);
  if (!res.ok) return undefined;
  return await res.json();
};

// --- LEAVE REQUESTS ---
export const getAllLeaveRequests = async (): Promise<LeaveRequest[]> => {
  const res = await fetch(`${BASE_URL}/leaves`);
  if (!res.ok) return [];
  return await res.json();
};

type ApplyLeavePayload = Omit<LeaveRequest, 'id' | 'status' | 'submittedAt' | 'documentUrl'>;

export const applyForLeave = async (payload: ApplyLeavePayload): Promise<LeaveRequest> => {
  const res = await fetch(`${BASE_URL}/leaves`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    credentials: 'include'
  });
  if (!res.ok) throw new Error('Failed to apply for leave');
  return await res.json();
};

interface UpdateStatusPayload {
  requestId: number;
  newStatus: LeaveStatus;
  actor: User;
}

export const updateLeaveStatus = async ({ requestId, newStatus, actor }: UpdateStatusPayload): Promise<LeaveRequest> => {
  const res = await fetch(`${BASE_URL}/leaves/${requestId}/status`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ newStatus, actorId: actor.id }),
    credentials: 'include'
  });
  if (!res.ok) throw new Error('Failed to update leave status');
  return await res.json();
};