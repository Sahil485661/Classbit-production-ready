import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    BarChart3, TrendingUp, TrendingDown, IndianRupee,
    Plus, Search, Calendar, FileText, PieChart as PieIcon,
    Edit3, Trash2
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import Modal from '../../components/Modal';

const AccountingPage = () => {
    const [transactions, setTransactions] = useState([]);
    const [summary, setSummary] = useState({ income: 0, expense: 0, balance: 0 });
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editId, setEditId] = useState(null);
    const [newTx, setNewTx] = useState({
        type: 'Income',
        category: 'Revenue',
        amount: '',
        description: '',
        date: new Date().toISOString().split('T')[0]
    });

    const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    const fetchData = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('/api/accounting', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setTransactions(res.data);

            const income = res.data.filter(t => t.type === 'Income').reduce((sum, t) => sum + parseFloat(t.amount), 0);
            const expense = res.data.filter(t => t.type === 'Expense').reduce((sum, t) => sum + parseFloat(t.amount), 0);
            setSummary({ income, expense, balance: income - expense });
        } catch (error) {
            console.error('Error fetching accounting data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleOpenModal = (tx = null) => {
        if (tx) {
            setEditId(tx.id);
            setNewTx({
                type: tx.type,
                category: tx.category,
                amount: tx.amount,
                description: tx.description || '',
                date: new Date(tx.date).toISOString().split('T')[0]
            });
        } else {
            setEditId(null);
            setNewTx({ type: 'Income', category: 'Revenue', amount: '', description: '', date: new Date().toISOString().split('T')[0] });
        }
        setIsModalOpen(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            if (editId) {
                await axios.put(`/api/accounting/${editId}`, newTx, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            } else {
                await axios.post('/api/accounting', newTx, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            }
            setIsModalOpen(false);
            fetchData();
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to securely commit transaction');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you absolutely sure you want to completely destroy this financial record? This cannot be undone.')) return;
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`/api/accounting/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchData();
        } catch (error) {
            alert('Failed to delete transaction.');
        }
    };

    const chartData = [
        { name: 'Income', amount: summary.income, color: '#10b981' },
        { name: 'Expense', amount: summary.expense, color: '#ef4444' }
    ];

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-center text-left">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text-primary)] italic">ERP Accounting Console</h1>
                    <p className="text-[var(--text-secondary)] mt-1">Real-time financial tracking and dynamic expenditure curation.</p>
                </div>
                <button
                    onClick={() => handleOpenModal()}
                    className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl font-semibold transition-all shadow-lg"
                >
                    <Plus className="w-5 h-5" />
                    New Entry
                </button>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                {[
                    { label: 'Net Liquidity', value: summary.balance, icon: IndianRupee, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
                    { label: 'Global Income', value: summary.income, icon: TrendingUp, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
                    { label: 'Total Burn Rate', value: summary.expense, icon: TrendingDown, color: 'text-rose-400', bg: 'bg-rose-500/10' },
                    { label: 'Tax Reserves', value: summary.balance * 0.1, icon: BarChart3, color: 'text-amber-400', bg: 'bg-amber-500/10' },
                ].map((stat, i) => (
                    <div key={i} className="bg-[var(--card-bg)] border border-[var(--border-color)] p-6 rounded-3xl shadow-xl hover:border-blue-500/30 transition-all">
                        <div className="flex justify-between items-start mb-4">
                            <div className={`p-3 ${stat.bg} ${stat.color} rounded-2xl`}>
                                <stat.icon className="w-6 h-6" />
                            </div>
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Live Feed</span>
                        </div>
                        <p className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest">{stat.label}</p>
                        <h3 className="text-2xl font-bold text-[var(--text-primary)] mt-1 italic">{fmt(stat.value)}</h3>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Visualizer Graph */}
                <div className="lg:col-span-2 bg-[var(--card-bg)] border border-[var(--border-color)] p-8 rounded-3xl shadow-xl">
                    <h3 className="text-lg font-bold text-[var(--text-primary)] mb-8 italic">Financial Flow Analysis</h3>
                    <div className="h-80">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} />
                                <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize={12} />
                                <YAxis stroke="var(--text-secondary)" fontSize={12} tickFormatter={(value) => `₹${value}`} />
                                <Tooltip
                                    formatter={(value) => [`₹${Number(value).toLocaleString('en-IN')}`, 'Amount']}
                                    contentStyle={{ backgroundColor: 'var(--card-bg)', borderColor: 'var(--border-color)', borderRadius: '12px' }}
                                    itemStyle={{ color: 'var(--text-primary)' }}
                                />
                                <Bar dataKey="amount" radius={[8, 8, 0, 0]}>
                                    {chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Ledger Grid */}
                <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-3xl shadow-xl overflow-hidden flex flex-col">
                    <div className="p-6 border-b border-[var(--border-color)] flex justify-between items-center">
                        <h3 className="text-lg font-bold text-[var(--text-primary)] italic">Recent Ledger</h3>
                        <span className="text-[10px] bg-blue-500/10 text-blue-500 px-2 py-0.5 rounded-full font-bold">{transactions.length} rows</span>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar max-h-[400px]">
                        {loading ? (
                            <div className="p-12 text-center text-[var(--text-secondary)] italic">Syncing with blockchain...</div>
                        ) : transactions.length === 0 ? (
                            <div className="p-12 text-center text-[var(--text-secondary)] italic">No transactions found. Begin logging data.</div>
                        ) : (
                            transactions.map((tx) => (
                                <div key={tx.id} className="p-4 border-b border-[var(--border-color)] hover:bg-[var(--bg-secondary)]/30 transition-all flex flex-col gap-3 group">
                                    <div className="flex justify-between items-start">
                                        <div className="flex items-start gap-4">
                                            <div className={`p-2 rounded-xl mt-1 ${tx.type === 'Income' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>
                                                {tx.type === 'Income' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold text-[var(--text-primary)]">{tx.category}</p>
                                                <p className="text-xs text-[var(--text-secondary)]">{tx.description || 'Enterprise Operational Node'}</p>
                                                <p className="text-[10px] text-[var(--text-secondary)] uppercase tracking-widest mt-1">
                                                    {new Date(tx.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className={`text-sm font-bold whitespace-nowrap ${tx.type === 'Income' ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                {tx.type === 'Income' ? '+' : '-'}{fmt(tx.amount)}
                                            </p>
                                        </div>
                                    </div>
                                    {/* Inline Hover CRUD Actions */}
                                    <div className="flex items-center gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button onClick={() => handleOpenModal(tx)} className="p-1.5 rounded-lg bg-[var(--bg-secondary)] text-blue-500 hover:bg-blue-500/20 transition-all border border-[var(--border-color)]">
                                            <Edit3 className="w-3.5 h-3.5" />
                                        </button>
                                        <button onClick={() => handleDelete(tx.id)} className="p-1.5 rounded-lg bg-[var(--bg-secondary)] text-red-500 hover:bg-red-500/20 transition-all border border-[var(--border-color)]">
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editId ? "Update Financial Ledger Block" : "Commit New Transaction Node"}>
                <form onSubmit={handleSave} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold text-[var(--text-secondary)] uppercase block mb-2">Flow Direction</label>
                            <select
                                className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl px-4 py-3 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                value={newTx.type}
                                onChange={(e) => setNewTx({ ...newTx, type: e.target.value })}
                            >
                                <option value="Income">Global Revenue (Income)</option>
                                <option value="Expense">Asset Expenditure (Expense)</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-[var(--text-secondary)] uppercase block mb-2">Ledger Category</label>
                            <input
                                type="text"
                                required
                                className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl px-4 py-3 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                placeholder="e.g. Payroll, Software, Sales"
                                value={newTx.category}
                                onChange={(e) => setNewTx({ ...newTx, category: e.target.value })}
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold text-[var(--text-secondary)] uppercase block mb-2">Net Amount (₹)</label>
                            <div className="relative">
                                <IndianRupee className="w-4 h-4 absolute left-3 top-3.5 text-[var(--text-secondary)]" />
                                <input
                                    type="number"
                                    required
                                    step="0.01"
                                    className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl pl-10 pr-4 py-3 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                    placeholder="0.00"
                                    value={newTx.amount}
                                    onChange={(e) => setNewTx({ ...newTx, amount: e.target.value })}
                                />
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-[var(--text-secondary)] uppercase block mb-2">Clearance Date</label>
                            <input
                                type="date"
                                required
                                className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl px-4 py-3 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                value={newTx.date}
                                onChange={(e) => setNewTx({ ...newTx, date: e.target.value })}
                            />
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-bold text-[var(--text-secondary)] uppercase block mb-2">Secure Descripton</label>
                        <textarea
                            rows="3"
                            className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl px-4 py-3 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500/50 custom-scrollbar"
                            placeholder="Optional metadata for the audit trail..."
                            value={newTx.description}
                            onChange={(e) => setNewTx({ ...newTx, description: e.target.value })}
                        ></textarea>
                    </div>
                    <div className="flex justify-end gap-3 pt-4 border-t border-[var(--border-color)]">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2.5 text-[var(--text-secondary)] font-bold hover:bg-[var(--hover-bg)] rounded-xl transition-all">
                            Abort
                        </button>
                        <button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-2.5 rounded-2xl font-bold transition-all shadow-lg active:scale-95 flex items-center gap-2">
                            {editId ? <Edit3 className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                            {editId ? "Overwrite Ledger" : "Lock In Database"}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default AccountingPage;
