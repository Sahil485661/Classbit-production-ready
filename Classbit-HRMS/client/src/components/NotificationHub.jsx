import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Bell, Megaphone, AlertCircle, Quote, Clock, Check, Calendar } from 'lucide-react';

const NotificationHub = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [notices, setNotices] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const prevUnreadRef = useRef(null);
    const dropdownRef = useRef(null);
    const navigate = useNavigate();

    const playNotificationSound = () => {
        try {
            const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(600, audioCtx.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.1);
            
            gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.2, audioCtx.currentTime + 0.05);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
            
            oscillator.start(audioCtx.currentTime);
            oscillator.stop(audioCtx.currentTime + 0.2);
        } catch (e) {
            console.error("Audio play failed", e);
        }
    };

    const fetchData = async () => {
        try {
            const token = localStorage.getItem('token');
            const headers = { Authorization: `Bearer ${token}` };

            const [noticesRes, notificationsRes] = await Promise.all([
                axios.get('/api/notices', { headers }),
                axios.get('/api/notifications', { headers })
            ]);

            const allNotices = Array.isArray(noticesRes.data) ? noticesRes.data.map(n => ({ ...n, entryType: 'Notice' })) : [];
            const allNotifications = Array.isArray(notificationsRes.data) ? notificationsRes.data.map(n => ({ ...n, entryType: 'Notification' })) : [];

            setNotices(allNotices);
            setNotifications(allNotifications);

            // Combined unread count
            const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
            const unreadNotices = allNotices.filter(n => new Date(n.createdAt) > last24h).length;
            const unreadNotifications = allNotifications.filter(n => !n.isRead).length;

            const totalUnread = unreadNotices + unreadNotifications;
            
            if (prevUnreadRef.current !== null && totalUnread > prevUnreadRef.current) {
                playNotificationSound();
            }
            prevUnreadRef.current = totalUnread;

            setUnreadCount(totalUnread);
        } catch (error) {
            console.error('Failed to fetch notifications', error);
        }
    };

    const markNotificationAsRead = async (id, type) => {
        try {
            const token = localStorage.getItem('token');
            await axios.patch(`/api/notifications/${id}/read`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchData();

            // Navigate based on type
            if (type === 'Grievance') navigate('/grievance');
            if (type === 'Leave') navigate('/leave');
            if (type === 'Task') navigate('/work');
            
            prevUnreadRef.current = Math.max(0, prevUnreadRef.current - 1);
            setIsOpen(false);
        } catch (e) { console.error(e); }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 30000); // Check every 30s
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const getTypeIcon = (type) => {
        switch (type) {
            case 'Announcement': return Megaphone;
            case 'Notice': return AlertCircle;
            case 'Quote': return Quote;
            case 'Task': return Clock;
            case 'Leave': return Calendar;
            case 'Grievance': return AlertCircle;
            case 'System': return AlertCircle;
            default: return Bell;
        }
    };

    const getTypeColor = (type) => {
        switch (type) {
            case 'Announcement': return 'text-blue-400';
            case 'Notice': return 'text-amber-400';
            case 'Quote': return 'text-purple-400';
            case 'Task': return 'text-blue-400';
            case 'Leave': return 'text-emerald-400';
            case 'Grievance': return 'text-rose-400';
            case 'System': return 'text-rose-400';
            default: return 'text-slate-400';
        }
    };

    const combinedList = [
        ...notices.map(n => ({ ...n, isSystem: true })),
        ...notifications.map(n => ({ ...n, isSystem: false }))
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 10);

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`relative p-2 rounded-xl transition-all ${isOpen ? 'bg-blue-600/10 text-blue-400' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}
            >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                    <span className="absolute top-2 right-2 flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                    </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 mt-4 w-96 bg-[var(--card-bg)] border border-[var(--border-color)] rounded-3xl shadow-2xl overflow-hidden z-[100] animate-in slide-in-from-top-2 duration-300">
                    <div className="p-4 border-b border-[var(--border-color)] bg-[var(--bg-secondary)]/10 flex justify-between items-center">
                        <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                            Communication Hub
                        </h3>
                        <span className="text-[10px] font-black bg-blue-500/10 text-blue-400 px-2.5 py-1 rounded-full uppercase tracking-tighter">
                            {unreadCount} New
                        </span>
                    </div>

                    <div className="max-h-[450px] overflow-y-auto">
                        {combinedList.length === 0 ? (
                            <div className="p-12 text-center">
                                <Bell className="w-12 h-12 text-slate-700 mx-auto mb-4 opacity-50" />
                                <p className="text-xs text-slate-500 italic">No recent updates.</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-[var(--border-color)]">
                                {combinedList.map((item) => {
                                    const Icon = getTypeIcon(item.type);
                                    const isUnread = !item.isSystem && !item.isRead;
                                    return (
                                        <div
                                            key={item.id}
                                            onClick={() => item.isSystem ? (setIsOpen(false), navigate('/dashboard')) : markNotificationAsRead(item.id, item.type)}
                                            className={`p-5 hover:bg-[var(--bg-secondary)]/50 transition-colors cursor-pointer group text-left ${isUnread ? 'bg-blue-500/5' : ''}`}
                                        >
                                            <div className="flex gap-4">
                                                <div className={`mt-1 p-2 rounded-xl bg-slate-900 border border-[var(--border-color)] ${getTypeColor(item.type)}`}>
                                                    <Icon className="w-4 h-4" />
                                                </div>
                                                <div className="flex-1">
                                                    <div className="flex justify-between items-start">
                                                        <h4 className={`text-xs font-bold transition-colors ${isUnread ? 'text-blue-400' : 'text-[var(--text-primary)]'} group-hover:text-blue-400`}>
                                                            {item.title || (item.isSystem ? 'System Broadcast' : 'Personal Update')}
                                                        </h4>
                                                        <span className="text-[9px] text-slate-500 font-bold uppercase tracking-tighter flex items-center gap-1">
                                                            <Clock className="w-2.5 h-2.5" />
                                                            {new Date(item.createdAt).toLocaleDateString()}
                                                        </span>
                                                    </div>
                                                    <p className="text-[11px] text-[var(--text-secondary)] mt-1.5 line-clamp-2 leading-relaxed opacity-80">
                                                        {item.message || item.content}
                                                    </p>
                                                    <div className="mt-3 flex items-center justify-between">
                                                        <span className={`text-[9px] font-black uppercase tracking-widest ${getTypeColor(item.type)} opacity-60`}>
                                                            {item.type}
                                                        </span>
                                                        {isUnread && (
                                                            <span className="text-[9px] text-blue-500 font-black uppercase tracking-widest">New</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    <div className="p-4 border-t border-[var(--border-color)] bg-[var(--bg-secondary)]/5 text-center">
                        <button className="text-xs font-bold text-slate-500 hover:text-blue-400 transition-colors">
                            View All Archive
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default NotificationHub;
