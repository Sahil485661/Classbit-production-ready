import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useSelector } from 'react-redux';
import {
    ChevronLeft, ChevronRight, Calendar as CalendarIcon,
    Plus, Trash2, Edit, Megaphone, AlertCircle, Quote as QuoteIcon,
    Briefcase, Clock, CalendarDays, ArrowRight
} from 'lucide-react';
import Modal from './Modal';

const EventCalendar = ({ permittedDesignations, viewMode = 'month' }) => {
    const { user } = useSelector((state) => state.auth);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [allEvents, setAllEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    
    // Modal states
    const [showDayModal, setShowDayModal] = useState(false);
    const [selectedDayEvents, setSelectedDayEvents] = useState([]);
    const [selectedDateStr, setSelectedDateStr] = useState('');
    
    // Form states
    const [showAddModal, setShowAddModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({
        type: 'Announcement', title: '', content: '', eventDate: '', isActive: true
    });

    const isPermitted = user?.role === 'Super Admin' || user?.role === 'HR' || 
                        (user?.Employee && (permittedDesignations || []).map(d => d.trim().toLowerCase()).includes(user.Employee.designation?.toLowerCase()));

    const fetchAllData = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const headers = { Authorization: `Bearer ${token}` };
            
            const leaveUrl = user.role === 'Employee' ? '/api/leave/my' : '/api/leave/all';
            
            // Fetch Notices, Tasks, Attendance, and Leaves in parallel
            const [noticesRes, tasksRes, attRes, leavesRes] = await Promise.allSettled([
                axios.get('/api/notices', { headers }),
                axios.get('/api/tasks/my', { headers }),
                axios.get('/api/attendance/my', { headers }),
                axios.get(leaveUrl, { headers })
            ]);

            let unifiedEvents = [];

            // 1. Process Notices (Only Announcements and Company Leaves, filter out standard text Notices)
            if (noticesRes.status === 'fulfilled' && Array.isArray(noticesRes.value.data)) {
                noticesRes.value.data.forEach(n => {
                    let category = 'HR Notices';
                    let color = 'Yellow'; // Default Reminders
                    let isCompanyLeave = false;
                    let showInCalendar = false;
                    
                    if (n.type === 'Announcement') { category = 'Company Events'; color = 'Blue'; showInCalendar = true; } 
                    if (n.title?.toLowerCase().includes('holiday')) { category = 'Company Events'; color = 'Green'; showInCalendar = true; }
                    
                    if (n.title?.startsWith('Company Leave:')) {
                        category = 'Company Leave';
                        color = 'Red';
                        isCompanyLeave = true;
                        showInCalendar = true;
                    }
                    
                    if (!showInCalendar) return;

                    unifiedEvents.push({
                        id: `notice-${n.id}`, originalId: n.id,
                        source: 'Notice', category, color,
                        title: isCompanyLeave ? n.title.replace('Company Leave: ', '') : (n.title || 'Notice'),
                        content: n.content,
                        dateObj: new Date(n.eventDate || n.createdAt),
                        isCompanyLeave,
                        raw: n
                    });
                });
            }

            // 2. Process Tasks
            if (tasksRes.status === 'fulfilled' && Array.isArray(tasksRes.value.data)) {
                unifiedEvents.push(...tasksRes.value.data.map(t => ({
                    id: `task-${t.id}`, originalId: t.id,
                    source: 'Task', category: 'Personal Tasks', color: 'Red',
                    title: `Deadline: ${t.title}`,
                    content: t.description,
                    dateObj: new Date(t.deadline),
                    raw: t
                })));
            }
            
            // 3. Process Attendance Check-ins (Shift schedule markers)
            if (attRes.status === 'fulfilled' && Array.isArray(attRes.value.data)) {
                unifiedEvents.push(...attRes.value.data.map(a => ({
                    id: `att-${a.id}`, originalId: a.id,
                    source: 'Attendance', category: 'Personal Tasks', color: 'Green', // Active presence
                    title: 'Shift Logged',
                    content: `Clocked in at ${new Date(a.checkIn).toLocaleTimeString()}`,
                    dateObj: new Date(a.date),
                    isAttendance: true,
                    raw: a
                })));
            }
            
            // 4. Process Leaves (Approved Only)
            if (leavesRes.status === 'fulfilled' && Array.isArray(leavesRes.value.data)) {
                leavesRes.value.data.forEach(l => {
                    if (l.status !== 'Approved') return;
                    
                    const start = new Date(l.startDate);
                    const end = new Date(l.endDate);
                    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                        unifiedEvents.push({
                            id: `leave-${l.id}-${d.getTime()}`, originalId: l.id,
                            source: 'Leave', category: 'Absence', color: 'Yellow',
                            title: user.role !== 'Employee' ? `${l.Employee?.firstName || 'Emp'} on Leave` : 'On Leave',
                            content: `Reason: ${l.reason}`,
                            dateObj: new Date(d),
                            isAbsence: true,
                            raw: l
                        });
                    }
                });
            }

            setAllEvents(unifiedEvents);
        } catch (error) {
            console.error('Failed to fetch calendar data', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAllData();
    }, []);

    const handleCreateNotice = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            if (isEditing) {
                await axios.put(`/api/notices/${editingId}`, formData, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            } else {
                await axios.post('/api/notices', formData, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            }
            setShowAddModal(false);
            setShowDayModal(false);
            setFormData({ type: 'Announcement', title: '', content: '', eventDate: '', isActive: true });
            setIsEditing(false);
            setEditingId(null);
            fetchAllData();
        } catch (err) {
            alert('Failed to save event.');
        }
    };

    const handleDeleteNotice = async (id) => {
        if (!window.confirm("Delete this notice?")) return;
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`/api/notices/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setShowDayModal(false);
            fetchAllData();
        } catch (err) {
            alert('Failed to delete notice.');
        }
    };

    const openEditModal = (ev) => {
        setIsEditing(true);
        setEditingId(ev.originalId);
        setFormData({
            type: ev.raw.type || 'Announcement',
            title: ev.raw.title || '',
            content: ev.raw.content || '',
            eventDate: ev.raw.eventDate ? new Date(ev.raw.eventDate).toISOString().split('T')[0] : '',
            isActive: ev.raw.isActive !== undefined ? ev.raw.isActive : true
        });
        setShowDayModal(false);
        setShowAddModal(true);
    };

    // Calendar generation math
    const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
    const startDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    const handleQuickJump = (e) => {
        if (!e.target.value) return;
        const [year, month] = e.target.value.split('-');
        setCurrentDate(new Date(parseInt(year), parseInt(month) - 1, 1));
    };

    const prevMonth = () => {
        if (viewMode === 'week') {
            setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() - 7));
        } else {
            setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
        }
    };
    const nextMonth = () => {
        if (viewMode === 'week') {
            setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate() + 7));
        } else {
            setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
        }
    };

    const openDay = (d) => {
        const dStr = d.toLocaleDateString();
        // Omit attendance from modal as the calendar cell background natively indicates attendance
        const eventsToday = allEvents.filter(ev => ev.dateObj.toLocaleDateString() === dStr && !ev.isAttendance);
        setSelectedDateStr(dStr);
        setSelectedDayEvents(eventsToday);
        setFormData({ ...formData, eventDate: `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` });
        setShowDayModal(true);
    };

    const getColorClasses = (color) => {
        switch (color) {
            case 'Red': return 'bg-red-500/10 text-red-500 border-red-500/20';
            case 'Blue': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
            case 'Green': return 'bg-green-500/10 text-green-500 border-green-500/20';
            case 'Yellow': return 'bg-amber-500/10 text-amber-500 border-amber-500/20';
            default: return 'bg-slate-500/10 text-slate-500 border-slate-500/20';
        }
    };

    const getSourceIcon = (source) => {
        if (source === 'Task') return <Briefcase className="w-3 h-3" />;
        if (source === 'Attendance') return <Clock className="w-3 h-3" />;
        return <Megaphone className="w-3 h-3" />;
    };

    // Calculate Upcoming 5 Events from today onwards
    const today = new Date();
    today.setHours(0,0,0,0);
    const upcomingEvents = allEvents
        .filter(ev => ev.dateObj >= today && !ev.isAttendance)
        .sort((a,b) => a.dateObj - b.dateObj)
        .slice(0, 5);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 lg:gap-8">
            {/* Calendar Main View */}
            <div className="lg:col-span-3 bg-[var(--card-bg)] border border-[var(--border-color)] rounded-3xl overflow-hidden shadow-2xl transition-colors">
                <div className="p-4 lg:p-6 border-b border-[var(--border-color)] flex flex-col md:flex-row justify-between items-start md:items-center bg-[var(--bg-secondary)]/30 gap-4">
                    <div className="flex items-start md:items-center gap-3 w-full">
                        <div className="p-2.5 lg:p-3 bg-blue-500/10 text-blue-500 rounded-xl shadow-inner shrink-0">
                            <CalendarDays className="w-5 h-5 lg:w-6 lg:h-6" />
                        </div>
                        <div className="w-full">
                            <h3 className="text-base lg:text-lg font-bold text-[var(--text-primary)] tracking-wide">Dashboard Calendar</h3>
                            <div className="flex flex-wrap gap-2 lg:gap-3 text-[9px] lg:text-[10px] text-[var(--text-secondary)] uppercase tracking-widest font-bold mt-1">
                                <span className="text-red-500 flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500" /> Deadlines/Holidays</span>
                                <span className="text-blue-500 flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-500" /> Meetings/Events</span>
                                <span className="text-green-500 flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-500" /> Shifts Logged</span>
                                <span className="text-amber-500 flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-amber-500" /> Staff Leaves</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 lg:gap-4 bg-[var(--card-bg)] p-2 rounded-2xl border border-[var(--border-color)] shadow-sm">
                        <button onClick={prevMonth} className="p-2 text-slate-400 hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] rounded-xl transition-colors"><ChevronLeft className="w-5 h-5" /></button>
                        {viewMode === 'week' ? (
                            <div className="text-sm lg:text-base font-bold text-[var(--text-primary)] px-2 text-center w-32 lg:w-36">
                                {currentDate.toLocaleDateString([], { month: 'short', year: 'numeric' })}
                            </div>
                        ) : (
                            <input 
                                type="month" 
                                className="bg-transparent text-sm lg:text-base font-bold text-[var(--text-primary)] w-32 lg:w-36 text-center focus:outline-none cursor-pointer"
                                value={`${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`}
                                onChange={handleQuickJump}
                            />
                        )}
                        <button onClick={nextMonth} className="p-1.5 lg:p-2 text-slate-400 hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] rounded-xl transition-colors"><ChevronRight className="w-5 h-5" /></button>
                    </div>
                </div>

                <div className="p-4 lg:p-6">
                    {/* Day Headers */}
                    <div className="grid grid-cols-7 gap-1 lg:gap-2 mb-2 lg:mb-3">
                        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                            <div key={d} className="text-center text-[9px] lg:text-[11px] font-black text-[var(--text-secondary)] uppercase tracking-widest py-1.5 lg:py-2 bg-[var(--bg-secondary)]/30 rounded-lg">
                                <span className="hidden sm:inline">{d}</span>
                                <span className="sm:hidden">{d[0]}</span>
                            </div>
                        ))}
                    </div>

                    {/* Calendar Grid */}
                    <div className="grid grid-cols-7 gap-1 flex-1 min-h-0 lg:gap-2">
                        {viewMode === 'month' && Array.from({ length: startDay }).map((_, i) => <div key={`empty-${i}`} className="bg-slate-500/5 rounded-xl border border-dashed border-[var(--border-color)] opacity-50 min-h-[60px] lg:min-h-[90px]" />)}
                        
                        {(viewMode === 'month' ? Array.from({ length: daysInMonth }).map((_, i) => {
                            const day = i + 1;
                            return new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                        }) : (() => {
                            const first = currentDate.getDate() - currentDate.getDay();
                            return Array.from({ length: 7 }).map((_, i) => new Date(currentDate.getFullYear(), currentDate.getMonth(), first + i));
                        })()).map((d) => {
                            const day = d.getDate();
                            const dStr = d.toLocaleDateString();
                            const allDayItems = allEvents.filter(n => n.dateObj.toLocaleDateString() === dStr);
                            const dailyEvents = allDayItems.filter(n => !n.isAttendance);
                            const hasAttended = allDayItems.some(n => n.isAttendance);
                            const isCompanyLeave = allDayItems.some(n => n.isCompanyLeave);
                            const isToday = new Date().toLocaleDateString() === dStr;
                            
                            return (
                                <button 
                                    key={dStr} 
                                    onClick={() => openDay(d)}
                                    className={`min-h-[60px] lg:min-h-[100px] p-1.5 lg:p-2.5 border rounded-xl flex flex-col items-start justify-start hover:shadow-lg transition-all overflow-hidden
                                        ${isToday 
                                            ? 'bg-blue-500/5 border-blue-500/40 ring-1 ring-blue-500 shadow-blue-500/10' 
                                            : isCompanyLeave
                                                ? 'bg-red-500/5 border-red-500 ring-1 ring-red-500/20 hover:border-red-400'
                                                : hasAttended 
                                                    ? 'bg-emerald-500/5 border-emerald-500/40 hover:border-emerald-500' 
                                                    : 'bg-[var(--card-bg)] border-[var(--border-color)] hover:border-blue-500/50'}
                                    `}
                                >
                                    <div className="flex justify-between w-full items-center mb-0.5 lg:mb-1">
                                        <span className={`text-xs lg:text-sm font-black ${isToday ? 'text-blue-500 bg-blue-500/10 px-1.5 lg:px-2 py-0.5 rounded-lg' : 'text-[var(--text-secondary)]'}`}>{day}</span>
                                        {dailyEvents.length > 0 && <span className="text-[8px] lg:text-[9px] bg-[var(--bg-secondary)] text-[var(--text-primary)] px-1 lg:px-1.5 py-0.5 rounded-md font-bold">{dailyEvents.length}</span>}
                                    </div>
                                    
                                    <div className="mt-1 lg:mt-2 w-full space-y-1 lg:space-y-1.5 flex-1 min-h-0 overflow-hidden">
                                        {dailyEvents.slice(0, 3).map((ev, idx) => (
                                            <div key={idx} className={`w-full text-[8.5px] lg:text-[10px] font-bold truncate px-1 lg:px-2 py-0.5 lg:py-1 rounded-md border text-left flex items-center gap-1 shadow-sm ${getColorClasses(ev.color)}`}>
                                                <span className="shrink-0 hidden sm:inline-block">{getSourceIcon(ev.source)}</span>
                                                <span className="truncate flex-1">{ev.title}</span>
                                            </div>
                                        ))}
                                        {dailyEvents.length > 3 && (
                                            <div className="text-[8px] lg:text-[10px] text-slate-500 font-bold italic w-full text-center hover:text-blue-400 mt-1 transition-colors">+{dailyEvents.length - 3}</div>
                                        )}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Upcoming Events Sidebar */}
            <div className="lg:col-span-1 space-y-6 flex flex-col max-h-[100%]">
                <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-3xl p-5 lg:p-6 shadow-2xl transition-colors flex-1 flex flex-col">
                    <div className="flex items-center gap-3 mb-4 lg:mb-6">
                        <div className="p-2 lg:p-2.5 bg-purple-500/10 text-purple-500 rounded-xl">
                            <ArrowRight className="w-4 h-4 lg:w-5 lg:h-5" />
                        </div>
                        <h3 className="text-md font-bold text-[var(--text-primary)]">Upcoming Activity</h3>
                    </div>
                    
                    <div className="flex-1 space-y-4">
                        {upcomingEvents.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-48 text-[var(--text-secondary)] italic border border-dashed border-[var(--border-color)] rounded-2xl">
                                <CalendarIcon className="w-8 h-8 opacity-20 mb-2" />
                                <p className="text-sm">No upcoming events</p>
                            </div>
                        ) : (
                            upcomingEvents.map(ev => (
                                <div key={`side-${ev.id}`} className={`p-4 rounded-2xl border flex flex-col gap-2 relative overflow-hidden group ${getColorClasses(ev.color).replace('bg-', 'bg-transparent hover:bg-')}`}>
                                    <div className={`absolute top-0 right-0 w-16 h-16 rounded-full -mr-8 -mt-8 opacity-20 blur-xl ${getColorClasses(ev.color).split(' ')[0]}`} />
                                    <div className="flex justify-between items-center relative z-10">
                                        <div className="flex items-center gap-1.5">
                                            {getSourceIcon(ev.source)}
                                            <span className="text-[9px] uppercase tracking-widest font-black opacity-70">{ev.category}</span>
                                        </div>
                                        <span className="text-[10px] font-bold opacity-80">{ev.dateObj.toLocaleDateString([], { month: 'short', day: 'numeric'})}</span>
                                    </div>
                                    <h4 className="font-bold text-sm line-clamp-2 relative z-10">{ev.title}</h4>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* Day Overview Modal */}
            <Modal isOpen={showDayModal} onClose={() => setShowDayModal(false)} title={`Agenda for ${new Date(selectedDateStr).toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'})}`}>
                <div className="space-y-6">
                    {selectedDayEvents.length === 0 ? (
                        <div className="p-12 border border-dashed border-[var(--border-color)] rounded-3xl text-center text-slate-500 italic">
                            <CalendarIcon className="w-12 h-12 mx-auto opacity-20 mb-4" />
                            <p>Your calendar is totally clear for this day.</p>
                        </div>
                    ) : (
                        <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                            {selectedDayEvents.map(ev => (
                                <div key={`modal-${ev.id}`} className={`p-5 border rounded-2xl relative overflow-hidden ${getColorClasses(ev.color).replace('bg-', 'bg-opacity-10 bg-')}`}>
                                    <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${getColorClasses(ev.color).split(' ')[0]}`} />
                                    <div className="flex justify-between items-start pl-2">
                                        <div className="flex items-center gap-2 mb-3">
                                            <div className={`p-1.5 rounded-lg border ${getColorClasses(ev.color)}`}>
                                                {getSourceIcon(ev.source)}
                                            </div>
                                            <div>
                                                <span className="text-[10px] font-black uppercase tracking-widest opacity-80 block">{ev.category}</span>
                                                <span className="text-[10px] font-medium opacity-60">Source: {ev.source}</span>
                                            </div>
                                        </div>
                                        
                                        {isPermitted && ev.source === 'Notice' && (
                                            <div className="flex gap-1">
                                                <button onClick={() => openEditModal(ev)} className="text-blue-400 hover:text-blue-300 p-2 hover:bg-blue-500/10 rounded-xl transition-colors" title="Edit Event">
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => handleDeleteNotice(ev.originalId)} className="text-red-400 hover:text-red-300 p-2 hover:bg-red-500/10 rounded-xl transition-colors" title="Delete Event">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    <h4 className="font-bold text-base pl-2">{ev.title}</h4>
                                    {ev.content && <p className="text-sm mt-3 text-[var(--text-secondary)] leading-relaxed pl-2 bg-[var(--bg-secondary)]/50 p-3 rounded-xl border border-[var(--border-color)]">{ev.content}</p>}
                                </div>
                            ))}
                        </div>
                    )}
                    
                    {isPermitted && (
                        <div className="pt-6 border-t border-[var(--border-color)] flex justify-between items-center">
                            <p className="text-[10px] text-[var(--text-secondary)] uppercase font-bold tracking-widest">Administrator Controls</p>
                            <button 
                                onClick={() => { 
                                    setShowDayModal(false); 
                                    setIsEditing(false); 
                                    setEditingId(null);
                                    setFormData({ type: 'Announcement', title: '', content: '', eventDate: '', isActive: true }); 
                                    setShowAddModal(true); 
                                }}
                                className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg shadow-blue-900/20"
                            >
                                <Plus className="w-4 h-4" /> Add Company Event
                            </button>
                        </div>
                    )}
                </div>
            </Modal>

            {/* Add Event Modal */}
            <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title={isEditing ? "Edit Event / Notice" : "Schedule Event / Notice"}>
                <form onSubmit={handleCreateNotice} className="space-y-6 text-left">
                    <div>
                        <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-2 block">Event Date</label>
                        <input
                            type="date"
                            required
                            className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                            value={formData.eventDate}
                            onChange={(e) => setFormData({ ...formData, eventDate: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-2 block">Event Title</label>
                        <input
                            type="text"
                            required
                            placeholder="e.g. Office Party, Townhall Meeting"
                            className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                            value={formData.title}
                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-2 block">Details / Agenda</label>
                        <textarea
                            required
                            rows="4"
                            placeholder="Provide any relevant details here to inform employees..."
                            className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                            value={formData.content}
                            onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                        />
                    </div>
                    <div className="flex justify-end gap-3 pt-6 border-t border-[var(--border-color)]">
                        <button type="button" onClick={() => setShowAddModal(false)} className="px-5 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-800 rounded-xl transition-colors">Cancel</button>
                        <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-2.5 rounded-xl font-bold shadow-lg shadow-blue-900/20">{isEditing ? "Update Event" : "Publish Event"}</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

export default EventCalendar;
