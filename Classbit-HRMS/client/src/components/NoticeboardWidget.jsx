import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Bell, Megaphone, AlertCircle, ChevronRight, CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const NoticeboardWidget = () => {
    const [notices, setNotices] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchNotices = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) return;
                const headers = { Authorization: `Bearer ${token}` };
                const res = await axios.get('/api/notices', { headers });
                
                const activeNotices = (res.data || [])
                    .filter(n => n.type === 'Notice' || n.type === 'Announcement');
                setNotices(activeNotices);
            } catch (err) {
                console.error('Error fetching notices highlight', err);
            } finally {
                setLoading(false);
            }
        };
        fetchNotices();
    }, []);

    const getTypeIcon = (type) => {
        switch (type) {
            case 'Announcement': return Megaphone;
            case 'Notice': return AlertCircle;
            default: return Bell;
        }
    };

    const getTypeColor = (type) => {
        switch (type) {
            case 'Announcement': return 'text-blue-500 bg-blue-500/10';
            case 'Notice': return 'text-amber-500 bg-amber-500/10';
            default: return 'text-slate-500 bg-slate-500/10';
        }
    };

    return (
        <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-3xl p-6 shadow-xl transition-colors h-full flex flex-col">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-widest flex items-center gap-2">
                    <Bell className="w-4 h-4 text-blue-500" />
                    Notice Board Highlight
                </h3>
                <button 
                    onClick={() => navigate('/notices')}
                    className="text-xs text-blue-500 font-bold hover:text-blue-400 transition-colors flex items-center"
                >
                    View All <ChevronRight className="w-3 h-3 ml-1" />
                </button>
            </div>

            <div className="flex-1 flex flex-col gap-3 overflow-y-auto max-h-[420px] custom-scrollbar pr-2 pb-2">
                {loading ? (
                    <div className="text-center text-[var(--text-secondary)] italic text-sm py-4 flex-1 flex items-center justify-center">Checking for updates...</div>
                ) : notices.length === 0 ? (
                    <div className="text-center text-[var(--text-secondary)] italic text-sm p-6 border border-dashed border-[var(--border-color)] rounded-2xl flex-1 flex flex-col items-center justify-center bg-[var(--bg-secondary)]/30">
                        <CheckCircle2 className="w-8 h-8 opacity-20 mb-2" />
                        <p>All caught up! No recent notices.</p>
                    </div>
                ) : (
                    notices.map((notice) => {
                        const Icon = getTypeIcon(notice.type);
                        return (
                            <div key={notice.id} onClick={() => navigate('/notices')} className="p-4 rounded-2xl border border-[var(--border-color)] hover:border-blue-500/30 transition-colors bg-[var(--bg-secondary)]/30 relative overflow-hidden group text-left cursor-pointer hover:bg-[var(--bg-secondary)]">
                                <div className="flex items-start gap-3">
                                    <div className={`p-2 rounded-xl shrink-0 ${getTypeColor(notice.type)}`}>
                                        <Icon className="w-4 h-4" />
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <div className="flex justify-between items-start">
                                            <h4 className="font-bold text-[var(--text-primary)] text-sm truncate pr-2">{notice.title || 'Broadcast Message'}</h4>
                                            <span className="text-[9px] font-black uppercase text-[var(--text-secondary)] tracking-widest shrink-0 opacity-60">
                                                {new Date(notice.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric'})}
                                            </span>
                                        </div>
                                        <p className="text-xs text-[var(--text-secondary)] line-clamp-2 mt-1.5 leading-relaxed">
                                            {notice.content}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default NoticeboardWidget;
