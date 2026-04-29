import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useSelector } from 'react-redux';
import { 
    Receipt, Plus, CheckCircle2, XCircle, 
    Clock, Search, FileText, Settings, ShieldAlert,
    Download, Mail
} from 'lucide-react';

const ReimbursementPage = () => {
    const { user, token } = useSelector((state) => state.auth);
    const [activeTab, setActiveTab] = useState('my_claims');
    const [claims, setClaims] = useState([]);
    const [allClaims, setAllClaims] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Form States
    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({
        categoryId: '',
        amount: '',
        expenseDate: '',
        description: '',
        receipt: null
    });

    const isHR = ['Super Admin', 'HR', 'Manager'].includes(user?.role);
    const isFinance = ['Super Admin', 'Finance'].includes(user?.role);
    const isAdmin = user?.role === 'Super Admin';

    useEffect(() => {
        fetchData();
    }, [activeTab]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const config = { headers: { Authorization: `Bearer ${token}` } };
            
            // Always fetch categories for the form
            if (categories.length === 0) {
                const catRes = await axios.get('/api/reimbursements/categories', config);
                setCategories(catRes.data);
            }

            if (activeTab === 'my_claims') {
                const res = await axios.get('/api/reimbursements/my', config);
                setClaims(res.data);
            } else if (activeTab === 'hr_approvals') {
                const res = await axios.get('/api/reimbursements/all?status=Pending', config);
                setAllClaims(res.data);
            } else if (activeTab === 'finance_approvals') {
                const res = await axios.get('/api/reimbursements/all?status=HR_Approved', config);
                setAllClaims(res.data);
            }
        } catch (error) {
            console.error('Failed to fetch:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateCategory = async (e) => {
        e.preventDefault();
        try {
            await axios.post('/api/reimbursements/categories', {
                name: e.target.name.value,
                description: e.target.desc.value,
                maxLimit: e.target.limit.value || 0
            }, { headers: { Authorization: `Bearer ${token}` } });
            
            e.target.reset();
            fetchData();
            alert('Category created successfully');
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to create category');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const data = new FormData();
            data.append('categoryId', formData.categoryId);
            data.append('amount', formData.amount);
            data.append('expenseDate', formData.expenseDate);
            data.append('description', formData.description);
            if (formData.receipt) data.append('receipt', formData.receipt);

            await axios.post('/api/reimbursements', data, {
                headers: { 
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                }
            });
            
            setShowModal(false);
            setFormData({ categoryId: '', amount: '', expenseDate: '', description: '', receipt: null });
            fetchData();
            alert('Claim submitted successfully!');
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to submit claim');
        }
    };

    const handleAction = async (id, action) => {
        try {
            const remarks = prompt(action.includes('reject') ? 'Reason for rejection:' : 'Remarks (optional):');
            if (action.includes('reject') && !remarks) return alert('Rejection requires a reason.');

            await axios.patch(`/api/reimbursements/${id}/status`, { action, remarks }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchData();
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to process action');
        }
    };

    const handleNotifyEmployee = async (id) => {
        try {
            await axios.post(`/api/email-actions/reimbursement/${id}/notify`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert('Employee notified successfully!');
        } catch (error) {
            alert('Failed to send notification: ' + (error.response?.data?.message || error.message));
        }
    };

    const renderStatusBadge = (status) => {
        const styles = {
            'Pending': 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
            'HR_Approved': 'bg-blue-500/10 text-blue-500 border-blue-500/20',
            'Finance_Verified': 'bg-purple-500/10 text-purple-500 border-purple-500/20',
            'Paid': 'bg-green-500/10 text-green-500 border-green-500/20',
            'Rejected': 'bg-red-500/10 text-red-500 border-red-500/20',
        };
        const icons = {
            'Pending': <Clock className="w-3 h-3" />,
            'HR_Approved': <CheckCircle2 className="w-3 h-3" />,
            'Finance_Verified': <ShieldAlert className="w-3 h-3" />,
            'Paid': <CheckCircle2 className="w-3 h-3" />,
            'Rejected': <XCircle className="w-3 h-3" />
        };
        
        return (
            <span className={`px-2.5 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5 w-fit ${styles[status]}`}>
                {icons[status]}
                {status.replace('_', ' ')}
            </span>
        );
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Header & Tabs */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[var(--card-bg)] p-6 rounded-2xl border border-[var(--border-color)]">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
                        <Receipt className="w-7 h-7 text-blue-500" />
                        Reimbursements Hub
                    </h1>
                    <p className="text-sm text-[var(--text-secondary)] mt-1">Submit, track, and approve corporate expenses.</p>
                </div>
                <div className="flex gap-2 p-1 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-color)] overflow-x-auto max-w-full">
                    <button
                        onClick={() => setActiveTab('my_claims')}
                        className={`px-4 py-2 text-sm font-bold rounded-lg transition-all whitespace-nowrap ${
                            activeTab === 'my_claims' ? 'bg-[var(--card-bg)] text-blue-500 shadow-sm border border-[var(--border-color)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                    >
                        My Claims
                    </button>
                    {isHR && (
                        <button
                            onClick={() => setActiveTab('hr_approvals')}
                            className={`px-4 py-2 text-sm font-bold rounded-lg transition-all whitespace-nowrap ${
                                activeTab === 'hr_approvals' ? 'bg-[var(--card-bg)] text-blue-500 shadow-sm border border-[var(--border-color)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                            }`}
                        >
                            HR Approvals
                        </button>
                    )}
                    {isFinance && (
                        <button
                            onClick={() => setActiveTab('finance_approvals')}
                            className={`px-4 py-2 text-sm font-bold rounded-lg transition-all whitespace-nowrap ${
                                activeTab === 'finance_approvals' ? 'bg-[var(--card-bg)] text-blue-500 shadow-sm border border-[var(--border-color)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                            }`}
                        >
                            Finance Verification
                        </button>
                    )}
                    {isAdmin && (
                        <button
                            onClick={() => setActiveTab('categories')}
                            className={`px-4 py-2 text-sm font-bold rounded-lg transition-all whitespace-nowrap ${
                                activeTab === 'categories' ? 'bg-[var(--card-bg)] text-blue-500 shadow-sm border border-[var(--border-color)]' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                            }`}
                        >
                            Categories
                        </button>
                    )}
                </div>
            </div>

            {/* Content Area */}
            <div className="bg-[var(--card-bg)] rounded-2xl border border-[var(--border-color)] p-6 shadow-sm">
                
                {/* MY CLAIMS VIEW */}
                {activeTab === 'my_claims' && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-lg font-bold text-[var(--text-primary)]">My Submitted Claims</h2>
                            <button
                                onClick={() => setShowModal(true)}
                                className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all shadow-lg shadow-blue-500/20"
                            >
                                <Plus className="w-4 h-4" /> New Claim
                            </button>
                        </div>
                        
                        {loading ? (
                            <div className="p-8 text-center text-[var(--text-secondary)] animate-pulse">Loading claims...</div>
                        ) : claims.length === 0 ? (
                            <div className="p-12 text-center border-2 border-dashed border-[var(--border-color)] rounded-2xl">
                                <Receipt className="w-12 h-12 text-[var(--text-muted)] mx-auto mb-3" />
                                <h3 className="text-[var(--text-primary)] font-bold">No claims found</h3>
                                <p className="text-sm text-[var(--text-secondary)]">You haven't submitted any reimbursement requests yet.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-[var(--border-color)] bg-[var(--bg-secondary)]">
                                            <th className="p-4 text-xs font-bold text-[var(--text-secondary)] uppercase">Date</th>
                                            <th className="p-4 text-xs font-bold text-[var(--text-secondary)] uppercase">Category</th>
                                            <th className="p-4 text-xs font-bold text-[var(--text-secondary)] uppercase">Amount</th>
                                            <th className="p-4 text-xs font-bold text-[var(--text-secondary)] uppercase">Status</th>
                                            <th className="p-4 text-xs font-bold text-[var(--text-secondary)] uppercase text-right">Receipt</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[var(--border-color)]">
                                        {claims.map(claim => (
                                            <tr key={claim.id} className="hover:bg-[var(--hover-bg)] transition-colors group">
                                                <td className="p-4 text-sm text-[var(--text-primary)]">{claim.expenseDate}</td>
                                                <td className="p-4 text-sm font-medium text-[var(--text-primary)]">
                                                    {claim.ReimbursementCategory?.name}
                                                    <p className="text-xs text-[var(--text-secondary)] font-normal mt-0.5 truncate max-w-[200px]">{claim.description}</p>
                                                </td>
                                                <td className="p-4">
                                                    <span className="text-sm font-bold text-[var(--text-primary)]">₹{Number(claim.amount).toLocaleString('en-IN')}</span>
                                                </td>
                                                <td className="p-4">
                                                    {renderStatusBadge(claim.status)}
                                                </td>
                                                <td className="p-4 text-right">
                                                    {claim.receiptUrl ? (
                                                        <a href={`${claim.receiptUrl}`} target="_blank" rel="noopener noreferrer" className="p-2 inline-flex bg-[var(--bg-secondary)] text-blue-500 rounded-lg hover:bg-blue-50">
                                                            <FileText className="w-4 h-4" />
                                                        </a>
                                                    ) : <span className="text-xs text-[var(--text-muted)] italic">No receipt</span>}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}

                {/* HR & FINANCE APPROVALS VIEW */}
                {(activeTab === 'hr_approvals' || activeTab === 'finance_approvals') && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-lg font-bold text-[var(--text-primary)]">
                                {activeTab === 'hr_approvals' ? 'Pending HR Approvals' : 'Pending Finance Verifications'}
                            </h2>
                        </div>
                        
                        {loading ? (
                            <div className="p-8 text-center text-[var(--text-secondary)] animate-pulse">Scanning queue...</div>
                        ) : allClaims.length === 0 ? (
                            <div className="p-12 text-center border-2 border-dashed border-[var(--border-color)] rounded-2xl">
                                <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3 opacity-50" />
                                <h3 className="text-[var(--text-primary)] font-bold">Inbox Zero!</h3>
                                <p className="text-sm text-[var(--text-secondary)]">There are no reimbursement claims waiting in your queue.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {allClaims.map(claim => (
                                    <div key={claim.id} className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center p-5 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl hover:border-blue-500/30 transition-all">
                                        <div className="flex gap-4 items-center w-full md:w-auto">
                                            <div className="hidden md:flex flex-shrink-0 p-3 bg-blue-500/10 text-blue-500 rounded-xl">
                                                <Receipt className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <div className="flex gap-2 items-center mb-1">
                                                    <h4 className="font-bold text-[var(--text-primary)]">{claim.Employee?.firstName} {claim.Employee?.lastName}</h4>
                                                    <span className="text-xs text-[var(--text-secondary)] font-mono">{claim.Employee?.employeeId}</span>
                                                </div>
                                                <div className="flex flex-wrap gap-2 text-sm text-[var(--text-secondary)]">
                                                    <span className="font-semibold text-[var(--text-primary)]">{claim.ReimbursementCategory?.name}</span>
                                                    <span>•</span>
                                                    <span>{claim.expenseDate}</span>
                                                    <span>•</span>
                                                    <span>{claim.description}</span>
                                                </div>
                                            </div>
                                        </div>
                                        
                                        <div className="flex flex-col md:flex-row items-start md:items-center gap-4 w-full md:w-auto justify-between border-t border-[var(--border-color)] md:border-0 pt-4 md:pt-0">
                                            <div className="text-left md:text-right">
                                                <p className="text-xs text-[var(--text-secondary)] uppercase font-bold">Amount</p>
                                                <p className="text-xl font-black text-[var(--text-primary)]">₹{Number(claim.amount).toLocaleString('en-IN')}</p>
                                            </div>
                                            
                                            {claim.receiptUrl && (
                                                <a href={`${claim.receiptUrl}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--card-bg)] text-blue-500 rounded-lg border border-[var(--border-color)] hover:bg-blue-50 text-sm font-bold">
                                                    <Download className="w-4 h-4" /> Receipt
                                                </a>
                                            )}

                                            <div className="flex gap-2 w-full md:w-auto mt-2 md:mt-0">
                                                <button
                                                    onClick={() => handleNotifyEmployee(claim.id)}
                                                    className="flex-1 md:flex-none px-4 py-2 bg-blue-500/10 hover:bg-blue-500 hover:text-white text-blue-500 font-bold rounded-xl transition-colors text-sm flex items-center justify-center"
                                                    title="Send Email"
                                                >
                                                    <Mail className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={() => handleAction(claim.id, activeTab === 'hr_approvals' ? 'hr_reject' : 'finance_reject')}
                                                    className="flex-1 md:flex-none px-4 py-2 bg-red-500/10 hover:bg-red-500 hover:text-white text-red-500 font-bold rounded-xl transition-colors text-sm"
                                                >
                                                    Reject
                                                </button>
                                                <button
                                                    onClick={() => handleAction(claim.id, activeTab === 'hr_approvals' ? 'hr_approve' : 'finance_verify')}
                                                    className="flex-1 md:flex-none px-4 py-2 bg-green-500 hover:bg-green-600 text-white font-bold rounded-xl shadow-lg shadow-green-500/20 transition-all text-sm"
                                                >
                                                    {activeTab === 'hr_approvals' ? 'Approve' : 'Verify for Payroll'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {/* CATEGORIES ADMIN VIEW */}
                {activeTab === 'categories' && isAdmin && (
                    <div className="space-y-6">
                        <div className="flex justify-between items-center mb-6 border-b border-[var(--border-color)] pb-4">
                            <div>
                                <h2 className="text-lg font-bold text-[var(--text-primary)]">Reimbursement Categories</h2>
                                <p className="text-sm text-[var(--text-secondary)]">Manage policy limits and allowed expense types.</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="md:col-span-1 border border-[var(--border-color)] bg-[var(--bg-secondary)] rounded-2xl p-5 shadow-sm h-fit">
                                <h3 className="font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                                    <Plus className="w-5 h-5 text-green-500" /> New Category
                                </h3>
                                <form onSubmit={handleCreateCategory} className="space-y-4">
                                    <div>
                                        <label className="text-xs font-bold text-[var(--text-secondary)] uppercase block mb-1.5">Category Name</label>
                                        <input type="text" name="name" required className="w-full bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-[var(--text-primary)] text-sm" placeholder="e.g. Travel, Meals" />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-[var(--text-secondary)] uppercase block mb-1.5">Description</label>
                                        <input type="text" name="desc" className="w-full bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-[var(--text-primary)] text-sm" placeholder="Optional context" />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold text-[var(--text-secondary)] uppercase block mb-1.5">Max Limit (₹) <span className="text-[10px] lowercase italic font-normal">(0 = unlimited)</span></label>
                                        <input type="number" name="limit" min="0" step="1" defaultValue="0" required className="w-full bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-[var(--text-primary)] text-sm" />
                                    </div>
                                    <button type="submit" className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-colors">Save Rule</button>
                                </form>
                            </div>

                            <div className="md:col-span-2 space-y-3">
                                {categories.length === 0 ? (
                                    <p className="text-sm text-[var(--text-secondary)] italic">No categories defined yet.</p>
                                ) : categories.map(c => (
                                    <div key={c.id} className="p-4 rounded-xl border border-[var(--border-color)] bg-[var(--card-bg)] flex justify-between items-center hover:border-blue-500/30 transition-colors">
                                        <div>
                                            <h4 className="font-bold text-[var(--text-primary)]">{c.name}</h4>
                                            <p className="text-xs text-[var(--text-secondary)] mt-0.5">{c.description || 'No description provided'}</p>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-xs font-bold text-[var(--text-secondary)] uppercase">Cap Policy</span>
                                            <p className={`font-black tracking-tight ${Number(c.maxLimit) === 0 ? 'text-green-500' : 'text-[var(--text-primary)]'}`}>
                                                {Number(c.maxLimit) === 0 ? 'UNLIMITED' : `₹${Number(c.maxLimit).toLocaleString('en-IN')}`}
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Submission Form Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <form onSubmit={handleSubmit} className="bg-[var(--card-bg)] w-full max-w-lg rounded-2xl border border-[var(--border-color)] shadow-2xl p-6 relative animate-in zoom-in-95 duration-200">
                        <button type="button" onClick={() => setShowModal(false)} className="absolute top-4 right-4 text-[var(--text-muted)] hover:text-red-500 p-1">
                            <XCircle className="w-6 h-6" />
                        </button>
                        
                        <div className="mb-6 pb-4 border-b border-[var(--border-color)]">
                            <h2 className="text-xl font-bold text-[var(--text-primary)]">Submit Reimbursement</h2>
                            <p className="text-sm text-[var(--text-secondary)] mt-1">Fill out the expense details carefully.</p>
                        </div>
                        
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-[var(--text-secondary)] uppercase block mb-2">Category</label>
                                <select 
                                    className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                    required
                                    value={formData.categoryId}
                                    onChange={(e) => setFormData({...formData, categoryId: e.target.value})}
                                >
                                    <option value="">Select Category...</option>
                                    {categories.map(c => (
                                        <option key={c.id} value={c.id}>{c.name} {Number(c.maxLimit) > 0 && `(Max: ₹${c.maxLimit})`}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-bold text-[var(--text-secondary)] uppercase block mb-2">Expense Date</label>
                                    <input 
                                        type="date"
                                        required
                                        className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                        value={formData.expenseDate}
                                        max={new Date().toISOString().split('T')[0]}
                                        onChange={(e) => setFormData({...formData, expenseDate: e.target.value})}
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-bold text-[var(--text-secondary)] uppercase block mb-2">Amount (₹)</label>
                                    <input 
                                        type="number"
                                        required
                                        min="1"
                                        step="0.01"
                                        placeholder="0.00"
                                        className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                        value={formData.amount}
                                        onChange={(e) => setFormData({...formData, amount: e.target.value})}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-[var(--text-secondary)] uppercase block mb-2">Description</label>
                                <textarea 
                                    required
                                    rows="2"
                                    placeholder="Brief reason for expense..."
                                    className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl px-4 py-3 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
                                    value={formData.description}
                                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                                />
                            </div>

                            <div>
                                <label className="text-xs font-bold text-[var(--text-secondary)] uppercase block mb-2">Receipt Upload (PDF/Image)</label>
                                <div className="border-2 border-dashed border-[var(--border-color)] rounded-xl p-4 flex justify-center bg-[var(--bg-secondary)] hover:bg-[var(--hover-bg)] transition-colors cursor-pointer relative overflow-hidden">
                                    <input 
                                        type="file" 
                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        accept="image/*,.pdf"
                                        onChange={(e) => setFormData({...formData, receipt: e.target.files[0]})} 
                                    />
                                    <div className="flex items-center gap-2 text-sm font-bold text-[var(--text-secondary)]">
                                        <FileText className="w-5 h-5" />
                                        {formData.receipt ? formData.receipt.name : 'Click or Drag to Upload'}
                                    </div>
                                </div>
                                <p className="text-[10px] text-[var(--text-muted)] mt-1 ml-1 text-right">* Required for amounts &gt; ₹1,000</p>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-[var(--border-color)]">
                            <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2.5 text-sm font-bold text-[var(--text-secondary)] hover:bg-[var(--hover-bg)] rounded-xl transition-colors">Cancel</button>
                            <button type="submit" className="px-6 py-2.5 text-sm font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-xl shadow-lg shadow-blue-500/20 transition-all flex items-center gap-2">
                                Submit Claim
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
};

export default ReimbursementPage;
