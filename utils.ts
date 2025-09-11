
import type { LeaveRequest, User } from './types';
import { LeaveType } from './types';

export const downloadLeaveReportAsCSV = (requests: LeaveRequest[], users: User[], filename: string) => {
    if (!requests || requests.length === 0) {
        alert("No data to download.");
        return;
    }

    const usersMap = new Map<number, User>();
    users.forEach(user => usersMap.set(user.id, user));

    const getLeaveDurationDays = (request: LeaveRequest): number => {
        if (request.leaveType === LeaveType.Permission) {
            return 0;
        }
        if (request.isHalfDay) {
            return 0.5;
        }
        const start = new Date(`${request.startDate}T00:00:00Z`);
        const end = new Date(`${request.endDate}T00:00:00Z`);
        // Add 1 to include both start and end dates in the count
        return (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24) + 1;
    };

    const headers = [
        'Request ID',
        'Employee Name',
        'Employee Email',
        'Leave Type',
        'Start Date',
        'End Date',
        'Duration (Days)',
        'Duration (Hours)',
        'Reason',
        'Status',
        'Submitted At'
    ];

    const csvRows = [headers.join(',')];

    // Sort requests by submission date for chronological order in the report
    const sortedRequests = [...requests].sort((a, b) => new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime());

    for (const request of sortedRequests) {
        const user = usersMap.get(request.userId);
        const row = [
            request.id,
            user?.name || 'Unknown',
            user?.email || 'N/A',
            request.leaveType,
            request.startDate,
            request.endDate,
            getLeaveDurationDays(request),
            request.durationHours || 0,
            `"${request.reason.replace(/"/g, '""')}"`, // Escape double quotes within the reason
            request.status,
            request.submittedAt
        ];
        csvRows.push(row.join(','));
    }

    const csvString = csvRows.join('\n');
    const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
};
