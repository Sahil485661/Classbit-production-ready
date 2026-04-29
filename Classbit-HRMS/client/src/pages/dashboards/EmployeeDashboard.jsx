import React, { useState, useEffect } from 'react';
import axios from 'axios';
import EventCalendar from '../../components/EventCalendar';
import NoticeboardWidget from '../../components/NoticeboardWidget';
import { useSelector } from 'react-redux';
import {
    Clock, Briefcase, MessageSquare,
    Quote, Play, Square, CheckCircle2,
    Calendar, AlertCircle, XCircle
} from 'lucide-react';
import { motion } from 'framer-motion';

import { useNavigate } from 'react-router-dom';

const DEFAULT_QUOTES = [
    { content: "The only way to do great work is to love what you do.", author: "Steve Jobs" },
    { content: "Success is not final, failure is not fatal: it is the courage to continue that counts.", author: "Winston Churchill" },
    { content: "Believe you can and you're halfway there.", author: "Theodore Roosevelt" },
    { content: "The future belongs to those who believe in the beauty of their dreams.", author: "Eleanor Roosevelt" },
    { content: "Don't watch the clock; do what it does. Keep going.", author: "Sam Levenson" }
];

const EmployeeDashboard = () => {
    const { user } = useSelector((state) => state.auth);
    const navigate = useNavigate();
    const [isClockedIn, setIsClockedIn] = useState(false);
    const [shiftCompleted, setShiftCompleted] = useState(false);
    const [clockInTime, setClockInTime] = useState(null);
    const [currentStatus, setCurrentStatus] = useState(null);
    const [showStatusMenu, setShowStatusMenu] = useState(false);
    const [myWork, setMyWork] = useState([]);
    const [quote, setQuote] = useState(null);
    const [loading, setLoading] = useState(true);
    const [permittedDesignations, setPermittedDesignations] = useState([]);
    const [managerInfo, setManagerInfo] = useState(null);

    const nowTime = new Date();
    const isAfterOfficeHours = nowTime.getHours() >= 18;

    useEffect(() => {
        const fetchDashboardData = async () => {
            setLoading(true);
            try {
                const token = localStorage.getItem('token');
                if (!token) return;
                const headers = { Authorization: `Bearer ${token}` };

                // Fetch individually to prevent one failure from blocking others
                try {
                    const workRes = await axios.get('/api/tasks/my', { headers });
                    setMyWork(Array.isArray(workRes.data) ? workRes.data : []);
                } catch (e) {
                    console.error('Tasks fetch failed', e);
                    setMyWork([]);
                }

                try {
                    const empRes = await axios.get('/api/employees', { headers });
                    const myEmpData = Array.isArray(empRes.data) ? empRes.data.find(e => e.userId === user.id) : null;
                    if (myEmpData) {
                        let manager = myEmpData.Manager;
                        if (!manager) {
                            manager = Array.isArray(empRes.data) ? empRes.data.find(e => 
                                e.departmentId === myEmpData.departmentId && 
                                e.id !== myEmpData.id && 
                                (e.User?.Role?.name === 'Manager' || e.designation === 'Manager')
                            ) : null;
                        }
                        if (manager) {
                            setManagerInfo(manager);
                        }
                    }
                } catch (e) {
                    console.error('Employee context fetch failed', e);
                }

                try {
                    const noticeRes = await axios.get('/api/notices', { headers });
                    const allNotices = Array.isArray(noticeRes.data) ? noticeRes.data : [];
                    const allQuotes = allNotices.filter(n => n.type === 'Quote');
                    const combinedQuotes = allQuotes.length > 0 ? allQuotes : DEFAULT_QUOTES;
                    
                    const dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24));
                    setQuote(combinedQuotes[dayOfYear % combinedQuotes.length]);
                } catch (e) { console.error('Notices fetch failed', e); }
                
                try {
                    const settingsRes = await axios.get('/api/setup', { headers });
                    const adminDesigs = settingsRes.data.find(s => s.key === 'eventAdminDesignations')?.value || '';
                    setPermittedDesignations(adminDesigs.split(',').map(d => d.trim()).filter(d => d));
                } catch (e) { console.error('Settings fetch failed', e); }

                try {
                    const attRes = await axios.get('/api/attendance/my', { headers });
                    const attData = Array.isArray(attRes.data) ? attRes.data : [];
                    const today = new Date().toLocaleDateString('en-CA');
                    const todayAtt = attData.find(a => a.date === today);
                    if (todayAtt) {
                        const checkInDate = new Date(todayAtt.checkIn);
                        setClockInTime(checkInDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
                        setCurrentStatus(todayAtt.currentStatus || 'Working');
                        
                        if (!todayAtt.checkOut) {
                            setIsClockedIn(true);
                            setShiftCompleted(false);
                        } else {
                            setIsClockedIn(false);
                            setShiftCompleted(true);
                        }
                    } else {
                        setIsClockedIn(false);
                        setShiftCompleted(false);
                        setClockInTime(null);
                    }
                } catch (e) { console.error('Attendance fetch failed', e); }

            } catch (error) {
                console.error('Error fetching dashboard data:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchDashboardData();
    }, []);

    const handleClockToggle = async () => {
        try {
            const token = localStorage.getItem('token');
            const headers = { Authorization: `Bearer ${token}` };

            if (!isClockedIn && !shiftCompleted) {
                const res = await axios.post('/api/attendance/clock-in', {}, { headers });
                const checkInDate = new Date(res.data.checkIn);
                setClockInTime(checkInDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
                setIsClockedIn(true);
                setShiftCompleted(false);
            } else if (isClockedIn) {
                await axios.post('/api/attendance/clock-out', {}, { headers });
                setIsClockedIn(false);
                setShiftCompleted(true);
            }
            // Trigger a re-fetch of all dashboard data to ensure consistency
            const workRes = await axios.get('/api/tasks/my', { headers });
            setMyWork(workRes.data);
        } catch (error) {
            alert(error.response?.data?.message || 'Attendance action failed');
        }
    };


    const handleStatusChange = async (type) => {
        try {
            const token = localStorage.getItem('token');
            await axios.post('/api/attendance/update-status', { type }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setCurrentStatus(type);
        } catch (error) {
            alert(error.response?.data?.message || 'Status update failed');
        }
    };

    if (loading) return <div className="p-8 text-slate-400 italic">Initializing workplace...</div>;

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="text-left">
                    <h1 className="text-2xl font-bold text-[var(--text-primary)] italic">
                        Welcome back, {user?.firstName}! ✨
                    </h1>
                    <p className="text-[var(--text-secondary)] mt-1 max-w-xl italic">
                        {quote ? `"${quote.content}" – ${quote.author || 'Unknown'}` : '"The only way to do great work is to love what you do." – Steve Jobs'}
                    </p>
                    {managerInfo && (
                        <div className="mt-4 px-4 py-2 bg-indigo-500/10 border border-indigo-500/20 rounded-xl inline-flex items-center gap-2 shadow-sm text-sm">
                            <Briefcase className="w-4 h-4 text-indigo-500" />
                            <span className="text-[var(--text-secondary)] font-medium">Reporting to:</span>
                            <span className="font-bold text-indigo-600 dark:text-indigo-400">{managerInfo.firstName} {managerInfo.lastName}</span>
                        </div>
                    )}
                </div>

                {/* Attendance Widget */}
                <div className="bg-[var(--card-bg)] border border-[var(--border-color)] p-4 rounded-2xl flex items-center gap-6 shadow-xl relative transition-colors">
                    <div className="absolute inset-0 overflow-hidden rounded-2xl pointer-events-none">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full -mr-16 -mt-16 blur-2xl" />
                    </div>
                    <div className="text-right relative z-10">
                        <p className="text-[10px] text-[var(--text-secondary)] uppercase font-bold tracking-widest">Shift Status</p>
                        <p className="text-sm font-bold text-[var(--text-primary)] mt-1 mb-1">
                            {shiftCompleted ? `Completed (${clockInTime})` : isClockedIn ? `Working since ${clockInTime}` : 'Not Clocked In'}
                        </p>
                        <p className="text-xs text-[var(--text-secondary)]">Office Time: 09:00 AM - 06:00 PM</p>
                    </div>
                    {!isClockedIn ? (
                        <button
                            onClick={handleClockToggle}
                            disabled={shiftCompleted || isAfterOfficeHours}
                            className={`
                                relative z-10 flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all transform active:scale-95 shadow-lg
                                ${shiftCompleted 
                                    ? 'bg-slate-500 hover:bg-slate-500 text-white shadow-none cursor-not-allowed opacity-50'
                                    : isAfterOfficeHours
                                    ? 'bg-slate-700 hover:bg-slate-700 text-slate-400 shadow-none cursor-not-allowed'
                                    : 'bg-green-600 hover:bg-green-500 text-white shadow-green-900/20'
                                }
                            `}
                        >
                            {shiftCompleted ? <CheckCircle2 className="w-4 h-4 fill-current text-[var(--card-bg)]" /> : <Play className="w-4 h-4 fill-current" />}
                            {shiftCompleted ? 'Shift Over' : isAfterOfficeHours ? 'Disabled' : 'Clock In'}
                        </button>
                    ) : (
                        <div className="relative z-50">
                            <button
                                onClick={() => setShowStatusMenu(!showStatusMenu)}
                                className="relative flex items-center justify-between min-w-[140px] gap-2 px-6 py-2.5 rounded-xl font-bold transition-all transform shadow-lg bg-blue-600 hover:bg-blue-500 text-white shadow-blue-900/20"
                            >
                                <div className="flex items-center gap-2">
                                    <Clock className="w-4 h-4" />
                                    {currentStatus || 'Working'}
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
                                            disabled={currentStatus === opt.value}
                                            className={`w-full text-left px-4 py-2 text-sm font-medium hover:bg-[var(--hover-bg)] transition-colors flex items-center gap-2 ${currentStatus === opt.value ? 'bg-[var(--bg-secondary)] text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'}`}
                                        >
                                            <span className={`w-2 h-2 rounded-full bg-current ${opt.color}`}></span>
                                            {opt.label}
                                        </button>
                                    ))}
                                    <div className="h-px bg-[var(--border-color)] my-2"></div>
                                    <button
                                        onClick={() => { handleClockToggle(); setShowStatusMenu(false); }}
                                        className="w-full text-left px-4 py-2 text-sm font-bold text-red-500 hover:bg-red-500/10 flex items-center gap-2 transition-colors"
                                    >
                                        <XCircle className="w-4 h-4" />
                                        Clock Out
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Work List */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold text-[var(--text-primary)] flex items-center gap-2">
                            <Briefcase className="w-5 h-5 text-blue-400" />
                            My Assigned Work
                        </h3>
                        <button 
                            onClick={() => navigate('/work')}
                            className="text-sm text-blue-500 font-bold tracking-wider hover:text-blue-400 hover:underline transition-colors"
                        >
                            View All Tasks
                        </button>
                    </div>

                    <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-3xl overflow-hidden shadow-xl transition-colors">
                        {myWork.length === 0 ? (
                            <div className="p-12 text-center text-slate-500 flex flex-col items-center gap-3">
                                <CheckCircle2 className="w-10 h-10 opacity-20" />
                                <p>All caught up! No pending tasks assigned.</p>
                            </div>
                        ) : (
                            myWork.map((task, idx) => (
                                <div
                                    key={task.id}
                                    onClick={() => navigate(`/work/tasks/${task.id}`)}
                                    className={`p-6 flex items-center justify-between hover:bg-[var(--bg-secondary)] transition-colors cursor-pointer ${idx !== myWork.length - 1 ? 'border-b border-[var(--border-color)]' : ''}`}
                                >
                                    <div className="flex gap-4 items-center">
                                        <div className={`p-3 rounded-xl ${task.priority === 'High' ? 'bg-red-500/10 text-red-400' :
                                            task.priority === 'Medium' ? 'bg-orange-500/10 text-orange-400' :
                                                'bg-blue-500/10 text-blue-400'
                                            }`}>
                                            <Briefcase className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h4 className="font-semibold text-[var(--text-primary)]">{task.title}</h4>
                                            <div className="flex items-center gap-3 mt-1.5">
                                                <span className="text-[10px] bg-[var(--bg-secondary)] text-[var(--text-secondary)] px-2 py-0.5 rounded uppercase font-bold tracking-tighter">
                                                    {task.priority} Priority
                                                </span>
                                                <span className="text-[10px] text-[var(--text-secondary)] font-medium">
                                                    Assigned by: {task.Creator?.Employee ? `${task.Creator.Employee.firstName} ${task.Creator.Employee.lastName}` : 'Admin'}
                                                </span>
                                                <span className="text-xs text-[var(--text-secondary)] italic">Deadline: {new Date(task.deadline).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase transition-all ${task.status === 'Completed' ? 'bg-green-500/10 text-green-500 border border-green-500/20' :
                                            'bg-yellow-500/10 text-yellow-500 border border-yellow-500/20'
                                            }`}>
                                            {task.status}
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <div className="lg:col-span-1 space-y-6">
                    <NoticeboardWidget />
                </div>
            </div>

            <div className="grid grid-cols-1 gap-8">
                {/* Event Calendar - Full Width Below */}
                <div className="pt-2">
                    <EventCalendar permittedDesignations={permittedDesignations} viewMode="week" />
                </div>
            </div>
        </div>
    );
};

export default EmployeeDashboard;
