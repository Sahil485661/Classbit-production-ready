import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useSelector } from 'react-redux';
import { Wallet, Plus, Clock, CheckCircle, XCircle, DollarSign, AlertCircle, Download, FileText, Mail } from 'lucide-react';
import Modal from '../../components/Modal';
import { useNavigate } from 'react-router-dom';

const LoanPage = () => {
    const { user } = useSelector((state) => state.auth);
    const navigate = useNavigate();
    const [loans, setLoans] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isApplyModalOpen, setIsApplyModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('Manage List');
    const [formData, setFormData] = useState({
        amount: '',
        repaymentMonths: '12',
        reason: ''
    });

    const fetchLoans = async () => {
        try {
            const token = localStorage.getItem('token');
            const url = (user.role === 'Super Admin' || user.role === 'HR')
                ? '/api/loan/all'
                : '/api/loan/my';
            const res = await axios.get(url, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setLoans(res.data);
        } catch (error) {
            console.error('Error fetching loans:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLoans();
    }, [user.role]);

    const handleApply = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            await axios.post('/api/loan/apply', formData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setIsApplyModalOpen(false);
            setFormData({ amount: '', repaymentMonths: '12', reason: '' });
            fetchLoans();
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to apply for loan');
        }
    };

    const handleUpdateStatus = async (id, status) => {
        try {
            const token = localStorage.getItem('token');
            await axios.patch(`/api/loan/${id}/status`, { status }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchLoans();
        } catch (error) {
            alert('Failed to update status');
        }
    };

    const handleNotifyEmployee = async (id) => {
        try {
            const token = localStorage.getItem('token');
            await axios.post(`/api/email-actions/loan/${id}/notify`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert('Employee notified successfully!');
        } catch (error) {
            alert('Failed to send notification: ' + (error.response?.data?.message || error.message));
        }
    };

    const handleExportCSV = () => {
        if (loans.length === 0) return alert('No loans available to export.');
        
        const csvRows = [];
        const headers = ["ID", "Employee_Name", "Employee_ID", "Total_Amount", "Paid_Amount", "Remaining_Amount", "Duration_Months", "Status", "Reason"];
        csvRows.push(headers.join(','));

        for (const loan of loans) {
            const paid = Number(loan.amount) - Number(loan.remainingAmount);
            const values = [
                loan.id,
                `"${loan.Employee?.firstName || 'Unknown'} ${loan.Employee?.lastName || ''}"`,
                `"${loan.Employee?.employeeId || 'N/A'}"`,
                loan.amount,
                paid,
                loan.remainingAmount,
                loan.repaymentMonths,
                loan.status,
                `"${(loan.reason || '').replace(/"/g, '""')}"`
            ];
            csvRows.push(values.join(','));
        }

        const csvString = csvRows.join('\n');
        const blob = new Blob([csvString], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.setAttribute('hidden', '');
        a.setAttribute('href', url);
        a.setAttribute('download', `Loan_Report_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    const tabs = ['Manage List', 'Pending Requests', 'Approved/Active', 'Completed', 'Rejected', 'Loan Report'];

    const displayedLoans = loans.filter(loan => {
        if (activeTab === 'Manage List') return true;
        if (activeTab === 'Pending Requests') return loan.status === 'Pending';
        if (activeTab === 'Approved/Active') return loan.status === 'Approved';
        if (activeTab === 'Completed') return loan.status === 'Completed';
        if (activeTab === 'Rejected') return loan.status === 'Rejected';
        return true; // Fallback
    });

    return (
        <div className="space-y-6 animate-in fade-in duration-500 max-w-7xl mx-auto">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text-primary)]">Loan & Advances</h1>
                    <p className="text-[var(--text-secondary)] mt-1">Manage employee financial assistance and real-time repayment schedules.</p>
                </div>
                <div className="flex gap-3">
                    {user.role === 'Employee' && (
                        <button
                            onClick={() => setIsApplyModalOpen(true)}
                            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-2.5 rounded-xl font-semibold transition-all shadow-lg shadow-indigo-500/20"
                        >
                            <Plus className="w-5 h-5" />
                            Apply for Loan
                        </button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {[
                    { label: 'Total Loans', value: loans.length, icon: Wallet, color: 'text-blue-500', bg: 'bg-blue-500/10' },
                    { label: 'Pending Approval', value: loans.filter(l => l.status === 'Pending').length, icon: Clock, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
                    { label: 'Active Loans', value: loans.filter(l => l.status === 'Approved').length, icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
                    { label: 'Paid Off', value: loans.filter(l => l.status === 'Completed').length, icon: DollarSign, color: 'text-indigo-500', bg: 'bg-indigo-500/10' },
                ].map((stat, i) => (
                    <div key={i} className="bg-[var(--card-bg)] border border-[var(--border-color)] p-6 rounded-3xl shadow-xl transition-colors hover:-translate-y-1 hover:border-indigo-500/30">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-[var(--text-secondary)] text-[10px] font-bold uppercase tracking-widest">{stat.label}</p>
                                <h3 className="text-3xl font-extrabold text-[var(--text-primary)] mt-3 tracking-tight">{stat.value}</h3>
                            </div>
                            <div className={`p-3 ${stat.bg} ${stat.color} rounded-2xl`}>
                                <stat.icon className="w-6 h-6" />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Dynamic React Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide border-b border-[var(--border-color)]">
                {tabs.map((tab) => {
                    const isReport = tab === 'Loan Report';
                    const isActive = activeTab === tab && !isReport;
                    
                    return (
                        <button
                            key={tab}
                            onClick={() => isReport ? handleExportCSV() : setActiveTab(tab)}
                            className={`flex items-center gap-2 px-6 py-3 rounded-t-xl text-sm font-bold whitespace-nowrap transition-all border-t border-x ${
                                isReport 
                                ? 'ml-auto border-transparent text-emerald-500 hover:text-white hover:bg-emerald-500 hover:shadow-lg rounded-xl mb-1'
                                : isActive 
                                    ? 'bg-[var(--card-bg)] text-indigo-500 border-[var(--border-color)] shadow-sm' 
                                    : 'bg-[var(--bg-secondary)] border-transparent text-[var(--text-secondary)] hover:bg-[var(--card-bg)] hover:text-[var(--text-primary)]'
                            }`}
                        >
                            {isReport ? <Download className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                            {tab}
                        </button>
                    );
                })}
            </div>

            <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-b-3xl rounded-tr-3xl overflow-hidden shadow-2xl transition-colors -mt-6">
                <div className="p-6 border-b border-[var(--border-color)] flex justify-between items-center bg-[var(--bg-secondary)]/30">
                    <h3 className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-widest">
                        {activeTab} Feed
                    </h3>
                    <span className="text-xs font-bold bg-indigo-500/10 text-indigo-500 px-3 py-1 rounded-full">
                        {displayedLoans.length} Records
                    </span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[1000px]">
                        <thead>
                            <tr className="bg-[var(--bg-secondary)]/80 text-[var(--text-secondary)] text-[10px] uppercase tracking-widest">
                                <th className="px-6 py-4 font-bold">Employee</th>
                                <th className="px-6 py-4 font-bold">Total Loan</th>
                                <th className="px-6 py-4 font-bold">Amount Paid</th>
                                <th className="px-6 py-4 font-bold">Remaining Left</th>
                                <th className="px-6 py-4 font-bold">Duration</th>
                                <th className="px-6 py-4 font-bold text-center">Status</th>
                                <th className="px-6 py-4 font-bold text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border-color)]">
                            {loading ? (
                                <tr>
                                    <td colSpan="7" className="px-6 py-16 text-center text-[var(--text-secondary)]">
                                        <div className="w-8 h-8 mx-auto border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3" />
                                        Syncing financial records...
                                    </td>
                                </tr>
                            ) : displayedLoans.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="px-6 py-16 text-center text-[var(--text-secondary)]">
                                        <Wallet className="w-12 h-12 mx-auto text-slate-400/40 mb-3" />
                                        <p className="font-bold text-[var(--text-primary)]">No Loans Found</p>
                                        <p className="text-xs mt-1">There are no applications matching the '{activeTab}' filter.</p>
                                    </td>
                                </tr>
                            ) : (
                                displayedLoans.map((loan) => {
                                    const paidAmount = Number(loan.amount) - Number(loan.remainingAmount);
                                    
                                    return (
                                        <tr key={loan.id} className="hover:bg-[var(--bg-secondary)]/30 transition-colors">
                                            <td className="px-6 py-4">
                                                <div 
                                                    className={`flex items-center gap-3 ${user.role === 'Super Admin' ? 'cursor-pointer hover:bg-indigo-50/10 p-2 -ml-2 rounded-xl transition-colors group/emp' : ''}`}
                                                    onClick={() => user.role === 'Super Admin' && navigate(`/employees/${loan.employeeId}`)}
                                                >
                                                    <div className="w-10 h-10 bg-indigo-500/10 text-indigo-500 rounded-xl flex items-center justify-center font-bold text-sm shadow-sm border border-indigo-500/20 group-hover/emp:border-indigo-400 group-hover/emp:shadow-md transition-all">
                                                        {loan.Employee?.firstName?.[0]}{loan.Employee?.lastName?.[0]}
                                                    </div>
                                                    <div>
                                                        <p className={`text-sm font-bold text-[var(--text-primary)] transition-colors ${user.role === 'Super Admin' ? 'group-hover/emp:text-indigo-400' : ''}`}>{loan.Employee?.firstName} {loan.Employee?.lastName}</p>
                                                        <p className="text-[10px] font-mono text-[var(--text-secondary)] mt-0.5">{loan.Employee?.employeeId}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-sm font-black text-[var(--text-primary)]">
                                                ₹{Number(loan.amount).toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4 text-sm font-black text-emerald-500">
                                                ₹{paidAmount.toLocaleString()}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`text-sm font-black ${loan.remainingAmount > 0 ? 'text-rose-500' : 'text-slate-400'}`}>
                                                    ₹{Number(loan.remainingAmount).toLocaleString()}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-sm text-[var(--text-secondary)] font-medium">
                                                {loan.repaymentMonths} Months
                                            </td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider shadow-sm border ${
                                                    loan.status === 'Approved' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                                                    loan.status === 'Rejected' ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' :
                                                    loan.status === 'Completed' ? 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20' :
                                                    'bg-amber-500/10 text-amber-500 border-amber-500/20'
                                                }`}>
                                                    {loan.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 flex justify-center items-center gap-2">
                                                {loan.status === 'Pending' && (user.role === 'Super Admin' || user.role === 'HR') ? (
                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={() => handleUpdateStatus(loan.id, 'Approved')}
                                                            className="p-2 bg-emerald-500/10 hover:bg-emerald-500 hover:text-white text-emerald-500 rounded-xl transition-all shadow-sm" title="Approve">
                                                            <CheckCircle className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleUpdateStatus(loan.id, 'Rejected')}
                                                            className="p-2 bg-rose-500/10 hover:bg-rose-500 hover:text-white text-rose-500 rounded-xl transition-all shadow-sm" title="Reject">
                                                            <XCircle className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                ) : (
                                                    <>
                                                        {(user.role === 'Super Admin' || user.role === 'HR') && (loan.status === 'Approved' || loan.status === 'Rejected') && (
                                                            <button
                                                                onClick={() => handleNotifyEmployee(loan.id)}
                                                                className="p-2 bg-blue-500/10 hover:bg-blue-500 hover:text-white text-blue-500 rounded-xl transition-all shadow-sm flex items-center justify-center" title="Send Status Email">
                                                                <Mail className="w-4 h-4" />
                                                            </button>
                                                        )}
                                                        <span className="text-[10px] text-[var(--text-secondary)] italic ml-1">Processed</span>
                                                    </>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <Modal isOpen={isApplyModalOpen} onClose={() => setIsApplyModalOpen(false)} title="Apply for Institutional Loan">
                <form onSubmit={handleApply} className="space-y-5 p-2">
                    <div>
                        <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider block mb-2">Loan Amount (₹)</label>
                        <input
                            type="number"
                            required
                            className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all font-bold"
                            placeholder="e.g. 50000"
                            value={formData.amount}
                            onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider block mb-2">Repayment Timeline</label>
                        <select
                            className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all font-bold"
                            value={formData.repaymentMonths}
                            onChange={(e) => setFormData({ ...formData, repaymentMonths: e.target.value })}
                        >
                            <option value="6">6 Months Term</option>
                            <option value="12">12 Months (1 Year)</option>
                            <option value="24">24 Months (2 Years)</option>
                            <option value="36">36 Months (3 Years)</option>
                        </select>
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider block mb-2">Justification / Reason</label>
                        <textarea
                            required
                            rows="4"
                            className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all"
                            placeholder="Briefly explain the nature of this financial request..."
                            value={formData.reason}
                            onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                        ></textarea>
                    </div>
                    <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-color)]">
                        <button type="button" onClick={() => setIsApplyModalOpen(false)} className="px-6 py-2.5 rounded-xl text-sm text-[var(--text-secondary)] font-bold hover:bg-[var(--hover-bg)] transition-colors">Abort</button>
                        <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white px-8 py-2.5 rounded-xl text-sm font-bold transition-all shadow-lg shadow-indigo-500/20">
                            Submit Request
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default LoanPage;
