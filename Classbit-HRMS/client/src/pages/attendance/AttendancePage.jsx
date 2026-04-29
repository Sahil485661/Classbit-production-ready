import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useSelector } from 'react-redux';
import {
    Clock, Calendar, CheckCircle, XCircle,
    AlertTriangle, Filter, Download
} from 'lucide-react';

const AttendancePage = () => {
    const { user } = useSelector((state) => state.auth);
    const [attendance, setAttendance] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({ 
        date: '', month: '', year: new Date().getFullYear().toString(), 
        departmentId: '', status: '', employeeId: '' 
    });
    const [departments, setDepartments] = useState([]);
    const [employeesList, setEmployeesList] = useState([]);
    const [showFilters, setShowFilters] = useState(false);
    const [isClocking, setIsClocking] = useState(false);
    const [showStatusMenu, setShowStatusMenu] = useState(false);

    // Derived State
    const todayStr = new Date().toLocaleDateString('en-CA');
    const todayRecord = attendance.find(rec => rec.date === todayStr && (user.role === 'Employee' ? true : rec.employeeId === user.employeeId));
    
    const nowHour = new Date().getHours();
    const isAfterOfficeHours = nowHour >= 18;
    
    const stats = {
        present: attendance.filter(r => r.status === 'Present' || r.status === 'Late').length,
        late: attendance.filter(r => r.status === 'Late').length,
        absent: attendance.filter(r => r.status === 'Absent').length,
        hours: attendance.reduce((acc, r) => acc + parseFloat(r.workingHours || 0), 0).toFixed(1)
    };

    useEffect(() => {
        fetchAttendance();
        if (user.role !== 'Employee') {
            fetchDepartments();
            fetchEmployeesList();
        }
    }, [user.role, filters]);

    const fetchEmployeesList = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('/api/employees', { headers: { Authorization: `Bearer ${token}` } });
            setEmployeesList(Array.isArray(res.data) ? res.data : (res.data.employees || []));
        } catch (error) { console.error('Error fetching employees:', error); }
    };

    const fetchDepartments = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('/api/employees/departments', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setDepartments(res.data);
        } catch (error) {
            console.error('Error fetching departments:', error);
        }
    };

    const fetchAttendance = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            let url = user.role === 'Employee'
                ? '/api/attendance/my'
                : '/api/attendance/all';

            const params = new URLSearchParams();
            if (filters.date) params.append('date', filters.date);
            if (!filters.date && filters.month) params.append('month', filters.month);
            if (!filters.date && filters.year) params.append('year', filters.year);
            if (filters.departmentId) params.append('departmentId', filters.departmentId);
            if (filters.employeeId) params.append('employeeId', filters.employeeId);

            const res = await axios.get(`${url}?${params.toString()}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setAttendance(res.data);
        } catch (error) {
            console.error('Error fetching attendance:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleStatusChange = async (type) => {
        if (!todayRecord || todayRecord.checkOut) return;
        setIsClocking(true);
        try {
            const token = localStorage.getItem('token');
            await axios.post('/api/attendance/update-status', { type }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            await fetchAttendance();
        } catch (error) {
            console.error('Status update error details:', error.response?.data || error.message);
            alert(`Status update failed: ${error.response?.data?.message || error.message}`);
        } finally {
            setIsClocking(false);
        }
    };

    const handleClockIn = async () => {
        if (todayRecord) return;
        setIsClocking(true);
        try {
            const token = localStorage.getItem('token');
            await axios.post('/api/attendance/clock-in', {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            await fetchAttendance();
        } catch (error) {
            alert(error.response?.data?.message || 'Clock-in failed');
        } finally {
            setIsClocking(false);
        }
    };

    const handleClockOut = async () => {
        if (!todayRecord || todayRecord.checkOut) return;
        setIsClocking(true);
        try {
            const token = localStorage.getItem('token');
            await axios.post('/api/attendance/clock-out', {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            await fetchAttendance();
        } catch (error) {
            alert(error.response?.data?.message || 'Clock-out failed');
        } finally {
            setIsClocking(false);
        }
    };

    const getBreakSummary = (activities) => {
        if (!activities || activities.length === 0) return null;
        
        const summary = activities.reduce((acc, act) => {
            if (act.type === 'Working') return acc;
            const type = act.type.replace(' Break', '');
            const duration = act.duration || 0;
            // If still active, calculate current duration
            let currentDur = duration;
            if (!act.endTime) {
                const now = new Date();
                const start = new Date(act.startTime);
                currentDur = Math.round((now - start) / (1000 * 60));
            }
            acc[type] = (acc[type] || 0) + currentDur;
            return acc;
        }, {});

        const items = Object.entries(summary).filter(([_, dur]) => dur > 0);
        if (items.length === 0) return null;

        return (
            <div className="flex flex-wrap gap-1 mt-1">
                {items.map(([type, dur]) => (
                    <span key={type} className="bg-slate-500/5 text-slate-500 text-[8px] px-1.5 py-0.5 rounded border border-slate-500/10">
                        {type}: {dur}m
                    </span>
                ))}
            </div>
        );
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'Present': return <span className="bg-green-500/10 text-green-500 border border-green-500/20 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider">Present</span>;
            case 'Late': return <span className="bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider">Late</span>;
            case 'Absent': return <span className="bg-red-500/10 text-red-500 border border-red-500/20 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider">Absent</span>;
            case 'Tea Break': case 'Coffee Break': case 'Lunch Break': case 'Rest Break': case 'Restroom Break': case 'Stretching Break': case 'Official Break':
                return <span className="bg-amber-500/10 text-amber-500 border border-amber-500/20 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider">{status}</span>;
            default: return <span className="bg-slate-500/10 text-slate-400 border border-slate-500/20 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider">{status}</span>;
        }
    };

    const filteredAttendance = attendance.filter(rec => {
        if (filters.status && rec.status !== filters.status) return false;
        return true;
    });

    const handleExport = () => {
        if (filteredAttendance.length === 0) return alert('No records to export');

        const headers = user.role !== 'Employee'
            ? ['Employee Name', 'Employee ID', 'Date', 'Check In', 'Check Out', 'Working Hours', 'Overtime', 'Status']
            : ['Date', 'Check In', 'Check Out', 'Working Hours', 'Overtime', 'Status'];

        const csvContent = [
            headers.join(','),
            ...filteredAttendance.map(rec => {
                const row = [];
                if (user.role !== 'Employee') {
                    row.push(`"${rec.Employee?.firstName} ${rec.Employee?.lastName}"`);
                    row.push(`"${rec.Employee?.employeeId}"`);
                }
                row.push(`"${new Date(rec.date).toLocaleDateString()}"`);
                row.push(`"${rec.checkIn ? new Date(rec.checkIn).toLocaleTimeString() : '--:--'}"`);
                row.push(`"${rec.checkOut ? new Date(rec.checkOut).toLocaleTimeString() : '--:--'}"`);
                row.push(`"${rec.workingHours || 0}h"`);
                row.push(`"${rec.overtime || 0}h"`);
                row.push(`"${rec.status}"`);
                return row.join(',');
            })
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `Attendance_Report_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text-primary)]">Attendance Log</h1>
                    <p className="text-[var(--text-secondary)] mt-1">
                        {user.role === 'Employee' ? 'View your daily attendance and work hours.' : 'Monitor and manage employee attendance records.'}
                    </p>
                </div>
                <div className="flex gap-3">
                    {user.role === 'Employee' && (
                        <div className="flex flex-col justify-center mr-4 border-r border-[var(--border-color)] pr-4 relative z-50">
                            <p className="text-xs text-[var(--text-secondary)] font-medium mb-1.5 self-start">Office Time: 09:00 AM - 06:00 PM</p>
                            <div className="flex gap-3 relative">
                                <button
                                    onClick={handleClockIn}
                                    disabled={!!todayRecord || isClocking || isAfterOfficeHours}
                                    className={`px-5 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${!!todayRecord || isClocking || isAfterOfficeHours ? 'bg-slate-700 text-slate-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-900/20'}`}
                                >
                                    <CheckCircle className="w-4 h-4" />
                                    {todayRecord ? 'Clocked In' : isAfterOfficeHours ? 'Disabled (> 6:00 PM)' : 'Clock In'}
                                </button>
                                
                                {todayRecord && !todayRecord.checkOut && (
                                    <div className="relative">
                                        <button
                                            onClick={() => setShowStatusMenu(!showStatusMenu)}
                                            className="px-5 py-2 rounded-xl text-sm font-bold transition-all flex items-center justify-between min-w-[140px] gap-2 bg-[var(--card-bg)] hover:bg-[var(--hover-bg)] text-[var(--text-primary)] border border-[var(--border-color)] shadow-md"
                                        >
                                            <div className="flex items-center gap-2">
                                                <Clock className="w-4 h-4 text-blue-500" />
                                                {todayRecord.currentStatus || 'Working'}
                                            </div>
                                            <span className="text-[10px]">▼</span>
                                        </button>
                                        
                                        {showStatusMenu && (
                                            <div className="absolute right-0 top-full mt-2 w-48 bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl shadow-2xl py-2 animate-in fade-in slide-in-from-top-2 z-50">
                                                {[
                                                    { label: 'Working', value: 'Working', color: 'text-blue-500' },
                                                    { label: 'Tea/Coffee', value: 'Tea Break', color: 'text-amber-500' },
                                                    { label: 'Lunch', value: 'Lunch Break', color: 'text-rose-500' },
                                                    { label: 'Rest', value: 'Rest Break', color: 'text-emerald-500' },
                                                    { label: 'Official', value: 'Official Break', color: 'text-purple-500' },
                                                ].map((opt) => (
                                                    <button
                                                        key={opt.value}
                                                        onClick={() => { handleStatusChange(opt.value); setShowStatusMenu(false); }}
                                                        disabled={isClocking || todayRecord.currentStatus === opt.value}
                                                        className={`w-full text-left px-4 py-2 text-sm font-medium hover:bg-[var(--hover-bg)] transition-colors flex items-center gap-2 ${todayRecord.currentStatus === opt.value ? 'bg-[var(--bg-secondary)] text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}
                                                    >
                                                        <span className={`w-2 h-2 rounded-full bg-current ${opt.color}`}></span>
                                                        {opt.label}
                                                    </button>
                                                ))}
                                                <div className="h-px bg-[var(--border-color)] my-2"></div>
                                                <button
                                                    onClick={() => { handleClockOut(); setShowStatusMenu(false); }}
                                                    disabled={isClocking}
                                                    className="w-full text-left px-4 py-2 text-sm font-bold text-red-500 hover:bg-red-500/10 flex items-center gap-2 transition-colors"
                                                >
                                                    <XCircle className="w-4 h-4" />
                                                    Clock Out
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                                {todayRecord?.checkOut && (
                                    <button
                                        disabled
                                        className="px-5 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 bg-slate-700 text-slate-400 cursor-not-allowed"
                                    >
                                        <XCircle className="w-4 h-4" />
                                        Clocked Out
                                    </button>
                                )}
                            </div>
                        </div>
                    )}
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all border ${showFilters ? 'bg-blue-500/10 border-blue-500 text-blue-400' : 'bg-[var(--card-bg)] border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--hover-bg)]'}`}
                    >
                        <Filter className="w-4 h-4" />
                        {showFilters ? 'Hide Filters' : 'Filter'}
                    </button>
                    <button
                        onClick={handleExport}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-sm font-medium transition-all shadow-lg shadow-blue-900/20"
                    >
                        <Download className="w-4 h-4" />
                        Export
                    </button>
                </div>
            </div>

            {/* Filter Bar */}
            {showFilters && (
                <div className="bg-[var(--card-bg)] border border-[var(--border-color)] p-4 rounded-2xl shadow-lg animate-in slide-in-from-top-2 duration-300">
                    <div className="flex gap-4 flex-wrap items-end">
                        
                        {/* Month / Year Filters */}
                        <div className="space-y-1.5 flex-1 min-w-[120px] text-left">
                            <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider ml-1">Month</label>
                            <select
                                className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl px-4 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                value={filters.month}
                                onChange={(e) => setFilters({ ...filters, month: e.target.value, date: '' })}
                            >
                                <option value="">All Months</option>
                                {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map((m, i) => (
                                    <option key={m} value={i + 1}>{m}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-1.5 flex-1 min-w-[120px] text-left">
                            <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider ml-1">Year</label>
                            <select
                                className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl px-4 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                value={filters.year}
                                onChange={(e) => setFilters({ ...filters, year: e.target.value, date: '' })}
                            >
                                {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                        </div>

                        {/* Specific Date Filter (Overrides Month/Year implicitly) */}
                        <div className="space-y-1.5 flex-1 min-w-[150px] text-left">
                            <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider ml-1">Specific Date</label>
                            <input
                                type="date"
                                className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl px-4 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                value={filters.date}
                                onChange={(e) => setFilters({ ...filters, date: e.target.value, month: '', year: '' })}
                            />
                        </div>

                        <div className="space-y-1.5 flex-1 min-w-[150px] text-left">
                            <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider ml-1">Status</label>
                            <select
                                className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl px-4 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                value={filters.status}
                                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                            >
                                <option value="">All Status</option>
                                <option value="Present">Present</option>
                                <option value="Late">Late</option>
                                <option value="Absent">Absent</option>
                            </select>
                        </div>
                        
                        {user.role !== 'Employee' && (
                            <>
                                <div className="space-y-1.5 flex-1 min-w-[180px] text-left">
                                    <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider ml-1">Department</label>
                                    <select
                                        className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl px-4 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                        value={filters.departmentId}
                                        onChange={(e) => setFilters({ ...filters, departmentId: e.target.value })}
                                    >
                                        <option value="">All Departments</option>
                                        {departments.map(d => (
                                            <option key={d.id} value={d.id}>{d.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-1.5 flex-1 min-w-[180px] text-left">
                                    <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider ml-1">Employee</label>
                                    <select
                                        className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl px-4 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                        value={filters.employeeId}
                                        onChange={(e) => setFilters({ ...filters, employeeId: e.target.value })}
                                    >
                                        <option value="">All Employees</option>
                                        {employeesList.map(e => (
                                            <option key={e.id} value={e.id}>{e.firstName} {e.lastName} ({e.employeeId})</option>
                                        ))}
                                    </select>
                                </div>
                            </>
                        )}
                        <button
                            onClick={() => setFilters({ date: '', month: '', year: new Date().getFullYear().toString(), departmentId: '', status: '', employeeId: '' })}
                            className="h-[38px] px-4 text-xs font-bold text-red-500 bg-red-500/10 rounded-xl hover:bg-red-500 hover:text-white transition-colors uppercase leading-none mb-1"
                        >
                            Reset
                        </button>
                    </div>
                </div>
            )}

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {[
                    { label: 'Present Days', value: stats.present, icon: CheckCircle, color: 'text-green-400', bg: 'bg-green-400/10' },
                    { label: 'Late Comings', value: stats.late, icon: Clock, color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
                    { label: 'Absent Days', value: stats.absent, icon: XCircle, color: 'text-red-400', bg: 'bg-red-400/10' },
                    { label: 'Working Hours', value: `${stats.hours}h`, icon: Calendar, color: 'text-blue-400', bg: 'bg-blue-400/10' },
                ].map((card, i) => (
                    <div key={i} className="bg-[var(--card-bg)] border border-[var(--border-color)] p-4 rounded-2xl flex items-center gap-4 transition-colors">
                        <div className={`${card.bg} p-2.5 rounded-xl`}>
                            <card.icon className={`w-5 h-5 ${card.color}`} />
                        </div>
                        <div>
                            <p className="text-xs text-[var(--text-secondary)] font-medium">{card.label}</p>
                            <p className="text-lg font-bold text-[var(--text-primary)]">{card.value}</p>
                        </div>
                    </div>
                ))}
            </div>

            <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-2xl overflow-hidden shadow-xl transition-colors standard-table">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-theme-header text-theme-muted text-[10px] uppercase tracking-widest">
                                {user.role !== 'Employee' && <th className="px-6 py-4 font-semibold">Employee</th>}
                                <th className="px-6 py-4 font-semibold">Date</th>
                                <th className="px-6 py-4 font-semibold">Check In</th>
                                <th className="px-6 py-4 font-semibold">Check Out</th>
                                <th className="px-6 py-4 font-semibold">Total Hours</th>
                                <th className="px-6 py-4 font-semibold">Overtime</th>
                                <th className="px-6 py-4 font-semibold">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border-color)]">
                            {loading ? (
                                <tr>
                                    <td colSpan="7" className="px-6 py-12 text-center text-slate-500 italic">Loading records...</td>
                                </tr>
                            ) : filteredAttendance.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="px-6 py-12 text-center text-slate-500 italic">No attendance records found for this filter.</td>
                                </tr>
                            ) : (
                                filteredAttendance.map((rec) => (
                                    <tr key={rec.id} className="hover:bg-slate-800/20 transition-colors">
                                        {user.role !== 'Employee' && (
                                            <td className="px-6 py-4">
                                                <div className="text-sm font-medium text-[var(--text-primary)]">
                                                    {rec.Employee?.firstName} {rec.Employee?.lastName}
                                                </div>
                                                <div className="text-[10px] text-[var(--text-secondary)]">{rec.Employee?.employeeId}</div>
                                            </td>
                                        )}
                                        <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">
                                            {new Date(rec.date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-[var(--text-primary)]">
                                            {rec.checkIn ? new Date(rec.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-[var(--text-primary)]">
                                            {rec.checkOut ? new Date(rec.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-[var(--text-secondary)] font-mono">{rec.workingHours}h</td>
                                        <td className="px-6 py-4 text-sm text-[var(--text-secondary)] font-mono">{rec.overtime}h</td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1">
                                                {getStatusBadge(rec.status)}
                                                {rec.currentStatus && rec.currentStatus !== rec.status && (
                                                    <span className="text-[9px] font-mono text-slate-500 uppercase">Current: {rec.currentStatus}</span>
                                                )}
                                                {getBreakSummary(rec.AttendanceActivities)}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default AttendancePage;
