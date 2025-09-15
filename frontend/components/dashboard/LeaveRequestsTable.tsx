
import React, { useState, useMemo, Fragment } from 'react';
import type { LeaveRequest, User } from '../../types';
import { LeaveStatus, LeaveType } from '../../types';
import { updateLeaveStatus } from '../../services/api';

interface LeaveRequestsTableProps {
  title: string;
  requests: LeaveRequest[];
  users: User[];
  currentUser: User;
  onRefreshData: () => void;
  isActionableView?: boolean;
  onApplyLeaveClick?: () => void;
  groupByMonth?: boolean;
  onDownloadReport?: () => void;
}

const LeaveRequestsTable: React.FC<LeaveRequestsTableProps> = ({
  title,
  requests,
  users,
  currentUser,
  onRefreshData,
  isActionableView = false,
  onApplyLeaveClick,
  groupByMonth = false,
  onDownloadReport,
}) => {
  const [isUpdating, setIsUpdating] = useState<Record<number, boolean>>({});

  const usersMap = useMemo(() => {
    const map = new Map<number, User>();
    users.forEach(user => map.set(user.id, user));
    return map;
  }, [users]);
  
  const handleUpdateStatus = async (requestId: number, newStatus: LeaveStatus) => {
    setIsUpdating(prev => ({ ...prev, [requestId]: true }));
    try {
        await updateLeaveStatus({ requestId, newStatus, actor: currentUser });
        onRefreshData();
    } catch (error) {
        console.error("Failed to update leave status:", error);
        // In a real app, show a toast notification to the user
        alert(`Failed to update status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
        setIsUpdating(prev => ({ ...prev, [requestId]: false }));
    }
  };

  const getStatusBadge = (status: LeaveStatus) => {
    const baseClasses = 'px-2.5 py-0.5 text-xs font-semibold rounded-full inline-block';
    switch (status) {
      case LeaveStatus.PendingManager:
      case LeaveStatus.PendingHR:
      case LeaveStatus.PendingAdmin:
        return `${baseClasses} bg-amber-100 text-amber-800`;
      case LeaveStatus.Approved:
        return `${baseClasses} bg-emerald-100 text-emerald-800`;
      case LeaveStatus.Rejected:
      case LeaveStatus.Cancelled:
        return `${baseClasses} bg-rose-100 text-rose-800`;
      default:
        return `${baseClasses} bg-slate-100 text-slate-800`;
    }
  };

  const formatDate = (dateString: string) => {
    // Dates are stored as YYYY-MM-DD. Parsing them as UTC prevents timezone-related date shifts.
    const date = new Date(`${dateString}T00:00:00Z`);
    return date.toLocaleDateString('en-US', { timeZone: 'UTC', month: 'short', day: 'numeric', year: 'numeric' });
  };
  
  const formatDuration = (request: LeaveRequest) => {
      if (request.leaveType === LeaveType.Permission) {
          return `${formatDate(request.startDate)} (${request.durationHours} ${request.durationHours === 1 ? 'hour' : 'hours'})`;
      }
      if (request.isHalfDay) {
          return `${formatDate(request.startDate)} (Half Day)`;
      }
      if (request.startDate === request.endDate) {
          return formatDate(request.startDate);
      }
      return `${formatDate(request.startDate)} - ${formatDate(request.endDate)}`;
  };

  
  // Sort requests by most recent start date
  const sortedRequests = useMemo(() => {
    return [...requests].sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());
  }, [requests]);


  const groupedRequests = useMemo(() => {
    if (!groupByMonth) return { 'All Requests': sortedRequests };
    
    return sortedRequests.reduce((acc, req) => {
        const date = new Date(`${req.startDate}T00:00:00Z`);
        const month = date.toLocaleString('en-US', { timeZone: 'UTC', month: 'long', year: 'numeric' });
        if (!acc[month]) {
            acc[month] = [];
        }
        acc[month].push(req);
        return acc;
    }, {} as Record<string, LeaveRequest[]>);
  }, [sortedRequests, groupByMonth]);
  

  const renderTableContent = (requestList: LeaveRequest[]) => (
    <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
            <thead className="bg-slate-50">
                <tr>
                    {isActionableView && <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Employee</th>}
                    <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Leave Type</th>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Dates & Duration</th>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Reason</th>
                    <th scope="col" className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                    {isActionableView && <th scope="col" className="relative px-6 py-3"><span className="sr-only">Actions</span></th>}
                </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200">
                {requestList.length === 0 ? (
                    <tr>
                        <td colSpan={isActionableView ? 6 : 5} className="px-6 py-8 whitespace-nowrap text-sm text-slate-500 text-center">No requests in this period.</td>
                    </tr>
                ) : (
                    requestList.map(request => (
                        <tr key={request.id} className="align-middle">
                            {isActionableView && <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">{usersMap.get(request.userId)?.name || 'Unknown User'}</td>}
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{request.leaveType}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">{formatDuration(request)}</td>
                            <td className="px-6 py-4 text-sm text-slate-500 max-w-[200px] truncate" title={request.reason}>{request.reason}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                                <span className={getStatusBadge(request.status)}>{request.status}</span>
                            </td>
                            {isActionableView && (
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                                    <button
                                        onClick={() => handleUpdateStatus(request.id, LeaveStatus.Approved)}
                                        disabled={isUpdating[request.id]}
                                        className="px-3 py-1 bg-green-500 text-white rounded-md text-xs font-semibold hover:bg-green-600 disabled:opacity-50 disabled:cursor-wait"
                                    >
                                        Approve
                                    </button>
                                    <button
                                        onClick={() => handleUpdateStatus(request.id, LeaveStatus.Rejected)}
                                        disabled={isUpdating[request.id]}
                                        className="px-3 py-1 bg-red-500 text-white rounded-md text-xs font-semibold hover:bg-red-600 disabled:opacity-50 disabled:cursor-wait"
                                    >
                                        Reject
                                    </button>
                                </td>
                            )}
                        </tr>
                    ))
                )}
            </tbody>
        </table>
    </div>
  );

  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200">
      <div className="flex justify-between items-center p-6 border-b border-slate-200">
        <h2 className="text-xl font-bold text-slate-800">{title}</h2>
        <div className="flex items-center space-x-2">
            {onDownloadReport && (
                 <button
                    onClick={onDownloadReport}
                    className="px-4 py-2 bg-white border border-slate-300 rounded-md text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                 >
                    Download Report
                </button>
            )}
            {onApplyLeaveClick && (
            <button
                onClick={onApplyLeaveClick}
                className="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
                + Apply for Leave
            </button>
            )}
        </div>
      </div>
      
      {Object.entries(groupedRequests).map(([group, requestList]) => (
        <Fragment key={group}>
            {groupByMonth && <h3 className="text-sm font-semibold text-slate-600 px-6 py-3 bg-slate-50 border-y border-slate-200">{group}</h3>}
            {renderTableContent(requestList)}
        </Fragment>
      ))}
    </div>
  );
};

export default LeaveRequestsTable;