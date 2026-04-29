import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useSelector } from 'react-redux';
import { History, Shield, LogIn, UserCircle, Settings, AlertTriangle, Search, Clock } from 'lucide-react';

const ActivitiesPage = () => {
    const { user } = useSelector((state) => state.auth);
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('All');
    const [searchTerm, setSearchTerm] = useState('');

    const fetchLogs = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('/api/activities', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setLogs(res.data);
        } catch (error) {
            console.error('Error fetching logs:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
    }, []);



    const getActionColor = (action) => {
        if (action.includes('CREATE') || action.includes('ADD')) return 'text-emerald-400';
        if (action.includes('DELETE') || action.includes('LOCK')) return 'text-rose-400';
        if (action.includes('UPDATE') || action.includes('EDIT')) return 'text-amber-400';
        return 'text-blue-400';
    };

    const getIcon = (action) => {
        if (action.includes('LOGIN')) return LogIn;
        if (action.includes('USER')) return UserCircle;
        if (action.includes('SETTING')) return Settings;
        if (action.includes('DELETE')) return AlertTriangle;
        return History;
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-center text-left">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text-primary)] italic">System Audit Trail</h1>
                    <p className="text-[var(--text-secondary)] mt-1">Verifiable immutable logs of every core operation in the cluster.</p>
                </div>
                <div className="relative group">
                    <Search className="w-4 h-4 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2 group-focus-within:text-blue-400 transition-colors" />
                    <input
                        type="text"
                        placeholder="Search audit IDs or users..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-2xl pl-12 pr-6 py-3 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-xl transition-all w-80"
                    />
                </div>
            </div>

            {/* Role Filtering Tabs */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {['All', 'Super Admin & HR', 'Managers', 'Employees'].map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-5 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition-all ${
                            activeTab === tab 
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' 
                            : 'bg-[var(--card-bg)] text-[var(--text-secondary)] border border-[var(--border-color)] hover:bg-[var(--hover-bg)]'
                        }`}
                    >
                        {tab} {tab !== 'All' ? 'Logs' : 'Activities'}
                    </button>
                ))}
            </div>

            <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-3xl shadow-2xl overflow-hidden transition-colors">
                <div className="p-6 border-b border-[var(--border-color)] flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <Shield className="w-5 h-5 text-emerald-500" />
                        <h3 className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-widest">Live Security Feed</h3>
                    </div>
                    <div className="flex items-center gap-4">
                        <button onClick={fetchLogs} className="text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors">Force Refresh</button>

                    </div>
                </div>

                <div className="divide-y divide-[var(--border-color)]">
                    {loading ? (
                        <div className="p-12 text-center text-[var(--text-secondary)] italic">Polling database for recent hooks...</div>
                    ) : logs.length === 0 ? (
                        <div className="p-12 text-center text-[var(--text-secondary)] italic">No recent activity detected.</div>
                    ) : (
                        logs.filter(log => {
                            // Search filter
                            if (searchTerm && !log.id.toLowerCase().includes(searchTerm.toLowerCase()) && !(log.User?.email || '').toLowerCase().includes(searchTerm.toLowerCase())) {
                                return false;
                            }
                            
                            if (activeTab === 'All') return true;
                            
                            const roleName = log.User?.Role?.name;
                            if (activeTab === 'Super Admin & HR') return roleName === 'Super Admin' || roleName === 'HR';
                            if (activeTab === 'Managers') return roleName === 'Manager';
                            if (activeTab === 'Employees') return Math.abs(roleName === 'Employee') || !roleName; // Fallback for null
                            
                            return true;
                        }).map((log) => {
                            const Icon = getIcon(log.action);
                            return (
                                <div key={log.id} className="p-6 hover:bg-[var(--bg-secondary)]/30 transition-all flex items-start gap-6">
                                    <div className={`p-4 rounded-2xl bg-[var(--bg-secondary)]/50 border border-[var(--border-color)] ${getActionColor(log.action)} shadow-sm`}>
                                        <Icon className="w-6 h-6" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start">
                                            <h4 className="font-bold text-[var(--text-primary)] text-sm tracking-tight">{log.action}</h4>
                                            <span className="text-[10px] font-bold text-[var(--text-secondary)] bg-[var(--bg-secondary)] px-2 py-1 rounded-md flex items-center gap-1.5">
                                                <Clock className="w-3 h-3" />
                                                {new Date(log.createdAt).toLocaleString()}
                                            </span>
                                        </div>
                                        <p className="text-xs text-[var(--text-secondary)] mt-2 leading-relaxed opacity-100">{log.details || 'No details tracked for this ping.'}</p>
                                        <div className="mt-4 flex items-center gap-3">
                                            <div className="w-5 h-5 bg-blue-500/20 rounded-full flex items-center justify-center">
                                                <UserCircle className="w-3 h-3 text-blue-400" />
                                            </div>
                                            <span className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-tighter">
                                                Triggered By: {log.User?.email || 'System Root'} <span className="ml-1 text-blue-500 opacity-60">[{log.User?.Role?.name || 'ROOT'}]</span>
                                            </span>
                                            <span className="text-[10px] text-slate-400 font-bold ml-auto font-mono opacity-100">HEX_ID: {log.id.substring(0, 8).toUpperCase()}</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        </div>
    );
};

export default ActivitiesPage;
