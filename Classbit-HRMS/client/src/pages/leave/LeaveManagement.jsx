import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useSelector } from 'react-redux';
import { Calendar, Plus, Clock, CheckCircle, XCircle, FileText, AlertCircle, Mail } from 'lucide-react';
import Modal from '../../components/Modal';

const LeaveManagement = () => {
    const { user } = useSelector((state) => state.auth);
    const [activeTab, setActiveTab] = useState('balance');
    const [leaves, setLeaves] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
    const [isCompanyLeaveModalOpen, setIsCompanyLeaveModalOpen] = useState(false);
    const [formData, setFormData] = useState({
        startDate: '',
        endDate: '',
        reason: '',
        leaveTypeId: 1 // Default to 1 (Annual) for now
    });
    const [companyLeaveData, setCompanyLeaveData] = useState({
        eventDate: '',
        title: '',
        content: ''
    });

    const fetchLeaves = async () => {
        try {
            const token = localStorage.getItem('token');
            const url = user.role === 'Employee'
                ? '/api/leave/my'
                : '/api/leave/all';
            const res = await axios.get(url, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setLeaves(res.data);
        } catch (error) {
            console.error('Error fetching leaves:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLeaves();
    }, [user.role]);

    const getUsedDaysThisMonth = (typeId, month, year) => {
        return leaves
            .filter(l =>
                l.status === 'Approved' &&
                Number(l.leaveTypeId) === typeId &&
                new Date(l.startDate).getMonth() === month &&
                new Date(l.startDate).getFullYear() === year &&
                (user.role === 'Employee' ? true : l.employeeId === user.employeeId)
            )
            .reduce((acc, curr) => acc + calculateDays(curr.startDate, curr.endDate), 0);
    };

    const handleApply = async (e) => {
        e.preventDefault();

        if (formData.endDate < formData.startDate) {
            return alert("Ending date cannot be before the starting date.");
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const startDateObj = new Date(formData.startDate);
        startDateObj.setHours(0, 0, 0, 0);
        
        const diffDays = (startDateObj - today) / (1000 * 60 * 60 * 24);
        
        if (diffDays < 2) {
            return alert("You must apply for leave at least 2 days in advance. Please contact HR or your manager for urgent leave requests.");
        }

        const appliedDays = calculateDays(formData.startDate, formData.endDate);
        const typeId = Number(formData.leaveTypeId);

        if (typeId === 1) {
            if (getUsedDays(1) + appliedDays > 12) {
                return alert(`Annual Leave limit exceeded. You only have ${Math.max(0, 12 - getUsedDays(1))} days left this year.`);
            }
        } else if (typeId === 2) {
            if (getUsedDays(2) + appliedDays > 10) {
                return alert(`Sick Leave limit exceeded. You only have ${Math.max(0, 10 - getUsedDays(2))} days left this year.`);
            }
        } else if (typeId === 3) {
            const startMonth = new Date(formData.startDate).getMonth();
            const startYear = new Date(formData.startDate).getFullYear();
            const usedThisMonth = getUsedDaysThisMonth(3, startMonth, startYear);
            
            if (usedThisMonth + appliedDays > 2) {
                return alert(`Casual Leave is limited to 2 days per month. You have already used ${usedThisMonth} day(s) in this month.`);
            }
        }

        try {
            const token = localStorage.getItem('token');
            await axios.post('/api/leave/apply', formData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setIsApplyModalOpen(false);
            setFormData({ startDate: '', endDate: '', reason: '', leaveTypeId: 1 });
            fetchLeaves();
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to apply for leave');
        }
    };

    const handleDeclareCompanyLeave = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            await axios.post('/api/notices', {
                type: 'Notice',
                title: `Company Leave: ${companyLeaveData.title}`,
                content: companyLeaveData.content,
                eventDate: companyLeaveData.eventDate,
                isActive: true
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setIsCompanyLeaveModalOpen(false);
            setCompanyLeaveData({ eventDate: '', title: '', content: '' });
            alert("Company leave declared. It will appear with a red border on all user calendars.");
        } catch (error) {
            alert('Failed to declare company leave');
        }
    };

    const handleUpdateStatus = async (id, status) => {
        try {
            const token = localStorage.getItem('token');
            await axios.patch(`/api/leave/${id}/status`, { status }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchLeaves();
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to update leave status');
        }
    };

    const handleNotifyEmployee = async (id) => {
        try {
            const token = localStorage.getItem('token');
            await axios.post(`/api/email-actions/leave/${id}/notify`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert('Employee notified successfully!');
        } catch (error) {
            alert('Failed to send notification: ' + (error.response?.data?.message || error.message));
        }
    };

    const calculateDays = (start, end) => {
        const d1 = new Date(start);
        const d2 = new Date(end);
        const diff = Math.abs(d2 - d1);
        return Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1;
    };

    const getUsedDays = (typeId) => {
        const currentYear = new Date().getFullYear();
        return leaves
            .filter(l =>
                l.status === 'Approved' &&
                Number(l.leaveTypeId) === typeId &&
                new Date(l.startDate).getFullYear() === currentYear &&
                (user.role === 'Employee' ? true : l.employeeId === user.employeeId)
            )
            .reduce((acc, curr) => acc + calculateDays(curr.startDate, curr.endDate), 0);
    };

    const leaveBalance = [
        { type: 'Annual Leave', total: 12, used: getUsedDays(1), remaining: Math.max(0, 12 - getUsedDays(1)), color: 'bg-blue-500' },
        { type: 'Sick Leave', total: 10, used: getUsedDays(2), remaining: Math.max(0, 10 - getUsedDays(2)), color: 'bg-red-500' },
        { type: 'Casual Leave (Month)', total: 2, used: getUsedDaysThisMonth(3, new Date().getMonth(), new Date().getFullYear()), remaining: Math.max(0, 2 - getUsedDaysThisMonth(3, new Date().getMonth(), new Date().getFullYear())), color: 'bg-emerald-500' },
    ];

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text-primary)]">Leave Management</h1>
                    <p className="text-[var(--text-secondary)] mt-1">Apply for leave and track your attendance status.</p>
                </div>
                <div className="flex gap-3">
                    {user.role !== 'Employee' && (
                        <button
                            onClick={() => setIsCompanyLeaveModalOpen(true)}
                            className="flex items-center gap-2 bg-red-600/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white px-5 py-2.5 rounded-xl font-semibold transition-all shadow-sm"
                        >
                            <AlertCircle className="w-5 h-5" />
                            Declare Company Leave
                        </button>
                    )}
                    <button
                        onClick={() => setIsApplyModalOpen(true)}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl font-semibold transition-all shadow-lg shadow-blue-900/20"
                    >
                        <Plus className="w-5 h-5" />
                        Apply for Leave
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {leaveBalance.map((item) => (
                    <div key={item.type} className="bg-[var(--card-bg)] border border-[var(--border-color)] p-6 rounded-2xl shadow-xl transition-colors">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-[var(--text-secondary)] text-xs font-semibold uppercase">{item.type}</p>
                                <div className="flex items-baseline gap-2 mt-2">
                                    <h3 className="text-3xl font-bold text-[var(--text-primary)]">{item.remaining}</h3>
                                    <span className="text-[var(--text-secondary)] text-sm">/ {item.total} Days</span>
                                </div>
                            </div>
                            <div className={`${item.color} w-2 h-12 rounded-full`} />
                        </div>
                        <div className="mt-6 w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                            <div
                                className={`${item.color} h-full`}
                                style={{ width: `${(item.remaining / item.total) * 100}%` }}
                            />
                        </div>
                    </div>
                ))}
            </div>

            <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-2xl overflow-hidden shadow-xl transition-colors standard-table">
                <div className="flex border-b border-[var(--border-color)]">
                    <button
                        onClick={() => setActiveTab('balance')}
                        className={`px-6 py-4 text-sm font-semibold transition-all ${activeTab === 'balance' ? 'text-blue-400 border-b-2 border-blue-400 bg-blue-500/10' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                    >
                        Leave History
                    </button>
                    <button
                        onClick={() => setActiveTab('requests')}
                        className={`px-6 py-4 text-sm font-semibold transition-all ${activeTab === 'requests' ? 'text-blue-400 border-b-2 border-blue-400 bg-blue-500/10' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                    >
                        Upcoming Holidays
                    </button>
                </div>

                <div className="p-0">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-theme-header text-theme-muted text-[10px] uppercase tracking-widest">
                                <th className="px-6 py-4">{user.role === 'Employee' ? 'Leave Type' : 'Applied By'}</th>
                                <th className="px-6 py-4">Date Range</th>
                                <th className="px-6 py-4">Days</th>
                                <th className="px-6 py-4">Reason</th>
                                <th className="px-6 py-4">Status</th>
                                {user.role !== 'Employee' && <th className="px-6 py-4 text-center">Actions</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border-color)]">
                            {loading ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-12 text-center text-[var(--text-secondary)] italic">Loading leave records...</td>
                                </tr>
                            ) : leaves.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-12 text-center text-[var(--text-secondary)] italic">No leave requests found.</td>
                                </tr>
                            ) : (
                                leaves.map((leave, idx) => (
                                    <tr key={leave.id} className="hover:bg-[var(--bg-secondary)] transition-colors">
                                        <td className="px-6 py-4 text-sm font-medium text-[var(--text-primary)]">
                                            {user.role === 'Employee'
                                                ? (leave.leaveTypeId == 1 ? 'Annual Leave' : leave.leaveTypeId == 2 ? 'Sick Leave' : 'Casual Leave')
                                                : `${leave.Employee?.firstName} ${leave.Employee?.lastName}`}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">
                                            {new Date(leave.startDate).toLocaleDateString()} - {new Date(leave.endDate).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">
                                            {calculateDays(leave.startDate, leave.endDate)}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-[var(--text-secondary)] italic">"{leave.reason}"</td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase ${leave.status === 'Approved' ? 'bg-green-500/10 text-green-500 border border-green-500/20' :
                                                leave.status === 'Rejected' ? 'bg-red-500/10 text-red-500 border border-red-500/20' :
                                                    'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20'
                                                }`}>
                                                {leave.status}
                                            </span>
                                        </td>
                                        {user.role !== 'Employee' && (
                                            <td className="px-6 py-4">
                                                <div className="flex justify-center gap-2">
                                                    {leave.status === 'Pending' ? (
                                                        <>
                                                            <button
                                                                onClick={() => handleUpdateStatus(leave.id, 'Approved')}
                                                                className="p-1.5 bg-green-500/10 text-green-500 hover:bg-green-500 hover:text-white rounded-lg transition-all"
                                                                title="Approve"
                                                            >
                                                                <CheckCircle className="w-4 h-4" />
                                                            </button>
                                                            <button
                                                                onClick={() => handleUpdateStatus(leave.id, 'Rejected')}
                                                                className="p-1.5 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-lg transition-all"
                                                                title="Reject"
                                                            >
                                                                <XCircle className="w-4 h-4" />
                                                            </button>
                                                        </>
                                                    ) : (
                                                        <>
                                                        {(user.role === 'Super Admin' || user.role === 'Manager' || user.role === 'HR') && (
                                                            <button
                                                                onClick={() => handleNotifyEmployee(leave.id)}
                                                                className="p-1.5 bg-blue-500/10 text-blue-500 hover:bg-blue-500 hover:text-white rounded-lg transition-all"
                                                                title="Send Status Email"
                                                            >
                                                                <Mail className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                        <span className="text-[10px] text-[var(--text-secondary)] italic uppercase ml-1 block my-auto">Processed</span>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        )}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <Modal isOpen={isApplyModalOpen} onClose={() => setIsApplyModalOpen(false)} title="Apply for Leave">
                <form onSubmit={handleApply} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold text-[var(--text-secondary)] uppercase block mb-2">Start Date</label>
                            <input
                                type="date"
                                required
                                className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-[var(--text-primary)] focus:outline-none"
                                value={formData.startDate}
                                onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-[var(--text-secondary)] uppercase block mb-2">End Date</label>
                            <input
                                type="date"
                                required
                                min={formData.startDate} // Ensure ending date is after or same as starting date natively in HTML
                                className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-[var(--text-primary)] focus:outline-none"
                                value={formData.endDate}
                                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                            />
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-[var(--text-secondary)] uppercase block mb-2">Leave Type</label>
                        <select
                            className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-[var(--text-primary)] focus:outline-none"
                            value={formData.leaveTypeId}
                            onChange={(e) => setFormData({ ...formData, leaveTypeId: e.target.value })}
                        >
                            <option value="1">Annual Leave</option>
                            <option value="2">Sick Leave</option>
                            <option value="3">Casual Leave</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-[var(--text-secondary)] uppercase block mb-2">Reason</label>
                        <textarea
                            required
                            rows="4"
                            className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-[var(--text-primary)] focus:outline-none"
                            placeholder="Briefly explain the reason for your leave..."
                            value={formData.reason}
                            onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                        ></textarea>
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                        <button type="button" onClick={() => setIsApplyModalOpen(false)} className="px-6 py-2.5 text-[var(--text-secondary)] font-semibold">Cancel</button>
                        <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-2.5 rounded-xl font-bold transition-all">
                            Submit Application
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Company Leave Modal */}
            <Modal isOpen={isCompanyLeaveModalOpen} onClose={() => setIsCompanyLeaveModalOpen(false)} title="Declare Company Leave">
                <form onSubmit={handleDeclareCompanyLeave} className="space-y-4">
                    <div>
                        <label className="text-xs font-bold text-[var(--text-secondary)] uppercase block mb-2">Leave Date</label>
                        <input
                            type="date"
                            required
                            className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none"
                            value={companyLeaveData.eventDate}
                            onChange={(e) => setCompanyLeaveData({ ...companyLeaveData, eventDate: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-[var(--text-secondary)] uppercase block mb-2">Occasion / Title</label>
                        <input
                            type="text"
                            required
                            className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none"
                            placeholder="e.g. Diwali, Christmas, Public Holiday"
                            value={companyLeaveData.title}
                            onChange={(e) => setCompanyLeaveData({ ...companyLeaveData, title: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="text-xs font-bold text-[var(--text-secondary)] uppercase block mb-2">Details (Optional)</label>
                        <textarea
                            rows="3"
                            className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none"
                            placeholder="Any additional instructions or description."
                            value={companyLeaveData.content}
                            onChange={(e) => setCompanyLeaveData({ ...companyLeaveData, content: e.target.value })}
                        ></textarea>
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                        <button type="button" onClick={() => setIsCompanyLeaveModalOpen(false)} className="px-6 py-2.5 text-[var(--text-secondary)] font-semibold">Cancel</button>
                        <button type="submit" className="bg-red-600 hover:bg-red-500 text-white px-8 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-red-900/20">
                            Declare Leave
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default LeaveManagement;
