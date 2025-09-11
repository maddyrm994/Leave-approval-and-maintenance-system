import React, { useState, useEffect, useMemo, useCallback } from 'react';
import type { User, LeaveRequest } from '../types';
import { UserRole, LeaveStatus } from '../types';
import { USERS } from '../constants';
import { getAllLeaveRequests } from '../services/api';
import { downloadLeaveReportAsCSV } from '../utils';
import StatCard from './dashboard/StatCard';
import LeaveRequestsTable from './dashboard/LeaveRequestsTable';
import ApplyLeaveModal from './dashboard/ApplyLeaveModal';

interface DashboardProps {
  currentUser: User;
  onDataChange: () => void;
}

const Dashboard: React.FC<DashboardProps> = ({ currentUser, onDataChange }) => {
  const [leaveRequests, setLeaveRequests] = useState<LeaveRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchRequests = useCallback(async () => {
    setIsLoading(true);
    try {
      const requests = await getAllLeaveRequests();
      setLeaveRequests(requests);
    } catch (error) {
      console.error("Failed to fetch leave requests:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);
  
  const handleSuccess = () => {
      setIsModalOpen(false);
      // Refresh both requests and user data (for balances)
      fetchRequests();
      onDataChange();
  }

  const handleDownloadReport = useCallback((requestsToDownload: LeaveRequest[], filename: string) => {
    // We pass all users so the utility can map IDs to names
    downloadLeaveReportAsCSV(requestsToDownload, USERS, filename);
  }, []);

  const { 
    myRequests, 
    actionableRequests, 
    allTeamRequests 
  } = useMemo(() => {
    const myRequests = leaveRequests.filter(r => r.userId === currentUser.id);
    
    let actionableRequests: LeaveRequest[] = [];
    if (currentUser.role === UserRole.Manager) {
        const teamMemberIds = USERS.filter(u => u.managerId === currentUser.id).map(u => u.id);
        actionableRequests = leaveRequests.filter(r => teamMemberIds.includes(r.userId) && r.status === LeaveStatus.PendingManager);
    } else if (currentUser.role === UserRole.HR) {
        actionableRequests = leaveRequests.filter(r => r.status === LeaveStatus.PendingHR || r.status === LeaveStatus.PendingManager);
    } else if (currentUser.role === UserRole.Admin) {
        actionableRequests = leaveRequests.filter(r => r.status === LeaveStatus.PendingAdmin || r.status === LeaveStatus.PendingHR);
    }

    const allTeamRequests = (currentUser.role === UserRole.Manager)
        ? leaveRequests.filter(r => USERS.find(u => u.id === r.userId)?.managerId === currentUser.id)
        : [];

    return { myRequests, actionableRequests, allTeamRequests };
  }, [leaveRequests, currentUser]);

  const leaveBalances = currentUser.leaveBalances;
  
  if (isLoading) {
    return (
        <div className="flex justify-center items-center h-full">
            <p className="text-slate-500 animate-pulse">Loading dashboard data...</p>
        </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Stat Cards (Hidden for Admin) */}
      {currentUser.role !== UserRole.Admin && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard title="Normal Leave Available" value={`${leaveBalances.normal} days`} />
            <StatCard title="Sick Leave Available" value={`${leaveBalances.sick} days`} />
            <StatCard title="Emergency Leave Available" value={`${leaveBalances.emergency} days`} />
            <StatCard title="Permission Hours Available" value={`${leaveBalances.permission} hours`} />
        </div>
      )}

      {/* Actionable Requests for Managers/HR/Admins */}
      {currentUser.role !== UserRole.Employee && actionableRequests.length > 0 && (
        <LeaveRequestsTable
          title="Action Required"
          requests={actionableRequests}
          users={USERS}
          currentUser={currentUser}
          onRefreshData={handleSuccess}
          isActionableView={true}
        />
      )}
      
      {/* HR & Admin: All Company Requests */}
      {(currentUser.role === UserRole.HR || currentUser.role === UserRole.Admin) && (
        <LeaveRequestsTable
          title="All Company Leave Requests"
          requests={leaveRequests}
          users={USERS}
          currentUser={currentUser}
          onRefreshData={handleSuccess}
          onDownloadReport={() => handleDownloadReport(leaveRequests, 'all_company_leaves.csv')}
        />
      )}

      {/* My Leave Requests for all users */}
      <LeaveRequestsTable
        title="My Leave History"
        requests={myRequests}
        users={USERS}
        currentUser={currentUser}
        onRefreshData={handleSuccess}
        onApplyLeaveClick={currentUser.role !== UserRole.Admin ? () => setIsModalOpen(true) : undefined}
        onDownloadReport={() => handleDownloadReport(myRequests, `${currentUser.name.replace(/\s+/g, '_').toLowerCase()}_leave_report.csv`)}
        groupByMonth={true}
      />
      
      {/* Team Requests for Managers */}
      {currentUser.role === UserRole.Manager && (
        <LeaveRequestsTable
          title="My Team's Leave History"
          requests={allTeamRequests}
          users={USERS}
          currentUser={currentUser}
          onRefreshData={handleSuccess}
          onDownloadReport={() => handleDownloadReport(allTeamRequests, 'team_leave_report.csv')}
        />
      )}

      {isModalOpen && (
        <ApplyLeaveModal 
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onSuccess={handleSuccess}
            currentUser={currentUser}
        />
      )}
    </div>
  );
};

export default Dashboard;