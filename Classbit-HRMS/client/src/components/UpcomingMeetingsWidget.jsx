import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useSelector } from 'react-redux';
import { Video, Calendar, Clock, CheckCircle, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const UpcomingMeetingsWidget = () => {
    const { token, user } = useSelector(state => state.auth);
    const [meetings, setMeetings] = useState([]);
    const navigate = useNavigate();

    const isManagerOrHR = ['Super Admin', 'HR', 'Manager'].includes(user.role);

    useEffect(() => {
        const fetchMeetings = async () => {
            try {
                const res = await axios.get('/api/meetings', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const upcoming = res.data
                    .filter(m => m.status !== 'Canceled')
                    .sort((a, b) => new Date(a.dateTime) - new Date(b.dateTime))
                    .slice(0, 3);
                setMeetings(upcoming);
            } catch (error) {
                console.error('Failed to fetch meetings', error);
            }
        };
        fetchMeetings();
    }, [token]);

    return (
        <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-2xl shadow-xl overflow-hidden transition-colors h-full flex flex-col group">
            <div className="p-5 border-b border-[var(--border-color)] flex justify-between items-center bg-gradient-to-r from-blue-500/10 to-transparent">
                <h3 className="text-sm font-extrabold text-[var(--text-primary)] uppercase tracking-widest flex items-center gap-2">
                    <Video className="w-5 h-5 text-blue-500" />
                    Upcoming Meetings
                </h3>
                <button 
                    onClick={() => navigate('/meetings')}
                    className="text-[10px] bg-[var(--bg-secondary)] hover:bg-blue-600 text-[var(--text-secondary)] hover:text-white px-3 py-1.5 rounded-full font-bold transition-all border border-[var(--border-color)] hover:border-transparent opacity-0 group-hover:opacity-100"
                >
                    VIEW ALL
                </button>
            </div>
            <div className="p-4 flex-1 flex flex-col gap-3 custom-scrollbar overflow-y-auto">
                {meetings.length === 0 ? (
                    <div className="flex flex-col items-center justify-center text-center p-8 text-slate-500 h-full">
                        <CheckCircle className="w-10 h-10 opacity-20 mb-3 text-blue-500" />
                        <p className="text-sm font-medium">No upcoming meetings scheduled.</p>
                        <p className="text-xs italic mt-1 opacity-60">You're all caught up!</p>
                    </div>
                ) : (
                    meetings.map(meeting => {
                        const showLink = isManagerOrHR || meeting.myReaction === 'Accepted';
                        return (
                            <div key={meeting.id} className="p-4 border border-[var(--border-color)] rounded-xl hover:border-blue-500/40 bg-[var(--bg-primary)] hover:bg-[var(--bg-secondary)] transition-all flex flex-col gap-3 relative overflow-hidden shadow-sm">
                                <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full -mr-10 -mt-10 blur-xl pointer-events-none"></div>
                                <div>
                                    <h4 className="font-bold text-[var(--text-primary)] text-sm line-clamp-1 pr-4">{meeting.title}</h4>
                                    <div className="flex items-center gap-3 mt-1.5 text-[11px] font-medium text-[var(--text-secondary)]">
                                        <span className="flex items-center gap-1.5 text-blue-500/80"><Calendar className="w-3.5 h-3.5" /> {new Date(meeting.dateTime).toLocaleDateString()}</span>
                                        <span className="flex items-center gap-1.5 text-emerald-500/80"><Clock className="w-3.5 h-3.5" /> {new Date(meeting.dateTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                    </div>
                                </div>
                                {(() => {
                                    const timeDiffMs = new Date(meeting.dateTime).getTime() - new Date().getTime();
                                    const isJoinActive = timeDiffMs <= 5 * 60 * 1000;
                                    
                                    if (isManagerOrHR) {
                                        return meeting.meetingLink ? (
                                            <a href={meeting.meetingLink} target="_blank" rel="noopener noreferrer" className="mt-1 flex items-center justify-center gap-2 w-full py-2 text-[10px] font-bold uppercase tracking-widest bg-blue-600 text-white rounded-lg transition-all shadow-md shadow-blue-500/20 hover:bg-blue-500 transform active:scale-[0.98]">
                                                Join Meeting <ExternalLink className="w-3 h-3" />
                                            </a>
                                        ) : null;
                                    } else {
                                        return isJoinActive && meeting.meetingLink ? (
                                            <a href={meeting.meetingLink} target="_blank" rel="noopener noreferrer" className="mt-1 flex items-center justify-center gap-2 w-full py-2 text-[10px] font-bold uppercase tracking-widest bg-blue-600 text-white rounded-lg transition-all shadow-md shadow-blue-500/20 hover:bg-blue-500 transform active:scale-[0.98]">
                                                Join Now <ExternalLink className="w-3 h-3" />
                                            </a>
                                        ) : (
                                            <button disabled className="mt-1 flex items-center justify-center gap-2 w-full py-2 text-[10px] font-bold uppercase tracking-widest bg-[var(--bg-secondary)] text-[var(--text-secondary)] border border-[var(--border-color)] rounded-lg opacity-60 cursor-not-allowed">
                                                {meeting.status === 'Canceled' ? 'Canceled' : 'Starts Shortly'}
                                            </button>
                                        );
                                    }
                                })()}
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default UpcomingMeetingsWidget;
