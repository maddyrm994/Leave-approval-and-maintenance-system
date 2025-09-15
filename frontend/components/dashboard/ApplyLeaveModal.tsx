
import React, { useState, useEffect } from 'react';
import type { User } from '../../types';
import { LeaveType } from '../../types';
import { applyForLeave } from '../../services/api';

interface ApplyLeaveModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    currentUser: User;
}

const ApplyLeaveModal: React.FC<ApplyLeaveModalProps> = ({ isOpen, onClose, onSuccess, currentUser }) => {
    const [leaveType, setLeaveType] = useState<LeaveType>(LeaveType.Normal);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [reason, setReason] = useState('');
    const [isHalfDay, setIsHalfDay] = useState(false);
    const [durationHours, setDurationHours] = useState<number>(1);
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen) {
            // Reset form on open
            const today = new Date().toISOString().split('T')[0];
            setLeaveType(LeaveType.Normal);
            setStartDate(today);
            setEndDate(today);
            setReason('');
            setError(null);
            setIsSubmitting(false);
            setIsHalfDay(false);
            setDurationHours(1);
        }
    }, [isOpen]);

    // Effect to handle date logic for half-day leaves
    useEffect(() => {
        if (isHalfDay || leaveType === LeaveType.Permission) {
            setEndDate(startDate);
        }
    }, [isHalfDay, startDate, leaveType]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (!startDate || !reason) {
            setError('Start date and reason are required.');
            return;
        }
        if (leaveType === LeaveType.Permission) {
            if (durationHours <= 0) {
                setError('Permission duration must be positive.');
                return;
            }
        } else {
             if (!endDate) {
                setError('End date is required.');
                return;
            }
            if (new Date(startDate) > new Date(endDate)) {
                setError('End date cannot be earlier than the start date.');
                return;
            }
        }
       
        setIsSubmitting(true);
        try {
            await applyForLeave({
                userId: currentUser.id,
                leaveType,
                startDate,
                endDate: leaveType === LeaveType.Permission ? startDate : endDate,
                reason,
                isHalfDay: leaveType === LeaveType.Normal || leaveType === LeaveType.Sick ? isHalfDay : undefined,
                durationHours: leaveType === LeaveType.Permission ? durationHours : undefined,
            });
            onSuccess();
        } catch (err: any) {
            setError(err.message || 'An unexpected error occurred.');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    const showHalfDayOption = leaveType === LeaveType.Normal || leaveType === LeaveType.Sick;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-40 flex justify-center items-center" aria-modal="true" role="dialog">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg m-4" role="document">
                <form onSubmit={handleSubmit}>
                    <div className="p-6 border-b">
                        <h2 className="text-xl font-bold text-slate-800">Apply for Leave</h2>
                        <p className="text-sm text-slate-500 mt-1">Submit a new leave request for approval.</p>
                    </div>
                    <div className="p-6 space-y-4">
                        {error && (
                            <div className="bg-red-100 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm" role="alert">
                                {error}
                            </div>
                        )}
                        <div>
                            <label htmlFor="leaveType" className="block text-sm font-medium text-slate-700 mb-1">Leave Type</label>
                            <select
                                id="leaveType"
                                value={leaveType}
                                onChange={(e) => setLeaveType(e.target.value as LeaveType)}
                                className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
                            >
                                <option value={LeaveType.Normal}>Normal</option>
                                <option value={LeaveType.Sick}>Sick</option>
                                <option value={LeaveType.Emergency}>Emergency</option>
                                <option value={LeaveType.Permission}>Permission (Hourly)</option>
                            </select>
                        </div>

                        {showHalfDayOption && (
                            <div className="flex items-center">
                                <input
                                    id="isHalfDay"
                                    type="checkbox"
                                    checked={isHalfDay}
                                    onChange={(e) => setIsHalfDay(e.target.checked)}
                                    className="h-4 w-4 text-red-600 border-slate-300 rounded focus:ring-red-500"
                                />
                                <label htmlFor="isHalfDay" className="ml-2 block text-sm text-slate-700">
                                    Request as Half Day
                                </label>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <div>
                                <label htmlFor="startDate" className="block text-sm font-medium text-slate-700 mb-1">
                                    {leaveType === LeaveType.Permission ? 'Date' : 'Start Date'}
                                </label>
                                <input
                                    type="date"
                                    id="startDate"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
                                />
                            </div>
                            {leaveType === LeaveType.Permission ? (
                                <div>
                                    <label htmlFor="durationHours" className="block text-sm font-medium text-slate-700 mb-1">Duration (Hours)</label>
                                    <input
                                        type="number"
                                        id="durationHours"
                                        value={durationHours}
                                        onChange={(e) => setDurationHours(Number(e.target.value))}
                                        min="1"
                                        className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
                                    />
                                </div>
                            ) : (
                                <div>
                                    <label htmlFor="endDate" className="block text-sm font-medium text-slate-700 mb-1">End Date</label>
                                    <input
                                        type="date"
                                        id="endDate"
                                        value={endDate}
                                        onChange={(e) => setEndDate(e.target.value)}
                                        disabled={isHalfDay}
                                        className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500 disabled:bg-slate-100"
                                    />
                                </div>
                            )}
                        </div>
                        <div>
                             <label htmlFor="reason" className="block text-sm font-medium text-slate-700 mb-1">Reason</label>
                             <textarea
                                id="reason"
                                rows={3}
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                placeholder="Please provide a brief reason for your leave..."
                                className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-red-500 focus:border-red-500"
                             ></textarea>
                        </div>
                    </div>
                    <div className="px-6 py-4 bg-slate-50 flex justify-end space-x-3 rounded-b-lg">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isSubmitting}
                            className="px-4 py-2 bg-white border border-slate-300 rounded-md text-sm font-medium text-slate-700 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-400 disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-4 py-2 bg-red-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-wait"
                        >
                            {isSubmitting ? 'Submitting...' : 'Submit Request'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ApplyLeaveModal;
