import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useSelector } from 'react-redux';
import { Video, Calendar, Clock, Plus, Users, Trash2, Edit, Mail } from 'lucide-react';
import MeetingModal from './MeetingModal';

const API = '/api';

const MeetingsPage = () => {
    const { user, token } = useSelector((state) => state.auth);
    const [meetings, setMeetings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [selectedMeeting, setSelectedMeeting] = useState(null);

    const isManagerOrHR = ['Super Admin', 'HR', 'Manager'].includes(user.role);

    useEffect(() => {
        fetchMeetings();
    }, []);

    const fetchMeetings = async () => {
        try {
            const res = await axios.get(`${API}/meetings`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setMeetings(res.data);
            setLoading(false);
        } catch (error) {
            console.error('Failed to fetch meetings', error);
            setLoading(false);
        }
    };

    const handleCreate = () => {
        setSelectedMeeting(null);
        setShowModal(true);
    };

    const handleEdit = (meeting) => {
        setSelectedMeeting(meeting);
        setShowModal(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Cancel this meeting?')) return;
        try {
            await axios.delete(`${API}/meetings/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchMeetings();
        } catch (error) {
            console.error('Failed to delete meeting', error);
        }
    };

    const handleReaction = async (id, status) => {
        try {
            await axios.post(`${API}/meetings/${id}/reaction`, { status }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchMeetings();
        } catch (error) {
            console.error('Reaction failed', error);
        }
    };

    const handleSendMail = async (id) => {
        try {
            const btn = document.getElementById(`mail-btn-${id}`);
            if (btn) btn.disabled = true;
            await axios.post(`${API}/meetings/${id}/send-email`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert('Emails dispatched successfully!');
        } catch (error) {
            console.error('Send mail failed', error);
            alert('Failed to send emails.');
        } finally {
            const btn = document.getElementById(`mail-btn-${id}`);
            if (btn) btn.disabled = false;
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text-primary)]">Meetings & Conferences</h1>
                    <p className="text-[var(--text-secondary)]">Manage and join upcoming meetings</p>
                </div>
                {isManagerOrHR && (
                    <button 
                        onClick={handleCreate}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition-colors"
                    >
                        <Plus className="w-4 h-4" /> Schedule Meeting
                    </button>
                )}
            </div>

            {loading ? (
                <div className="text-center p-8 text-[var(--text-secondary)]">Loading...</div>
            ) : meetings.length === 0 ? (
                <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl p-12 text-center">
                    <Video className="w-12 h-12 text-[var(--text-secondary)] mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-bold text-[var(--text-primary)] mb-1">No Upcoming Meetings</h3>
                    <p className="text-[var(--text-secondary)]">You don't have any scheduled meetings.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {meetings.map((meeting) => {
                        let reactions = [];
                        try {
                            reactions = Array.isArray(meeting.employeeReactions)
                                ? meeting.employeeReactions
                                : (typeof meeting.employeeReactions === 'string' ? JSON.parse(meeting.employeeReactions) : []);
                        } catch (e) {
                            reactions = [];
                        }

                        const myReaction = meeting.myReaction;

                        return (
                            <div key={meeting.id} className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl p-5 hover:border-blue-500/50 transition-all shadow-sm">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-blue-500/10 text-blue-500 rounded-xl flex items-center justify-center">
                                            <Video className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-[var(--text-primary)]">{meeting.title}</h3>
                                            <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
                                                <Calendar className="w-3 h-3" /> {new Date(meeting.dateTime).toLocaleDateString()}
                                                <Clock className="w-3 h-3 ml-2" /> {new Date(meeting.dateTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                            </div>
                                        </div>
                                    </div>
                                    {isManagerOrHR && (
                                        <div className="flex items-center gap-1">
                                            <button onClick={() => handleEdit(meeting)} className="p-1.5 text-[var(--text-secondary)] hover:text-blue-500 hover:bg-[var(--hover-bg)] rounded-lg transition-colors">
                                                <Edit className="w-4 h-4" />
                                            </button>
                                            <button onClick={() => handleDelete(meeting.id)} className="p-1.5 text-[var(--text-secondary)] hover:text-rose-500 hover:bg-[var(--hover-bg)] rounded-lg transition-colors">
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <div className="mb-4">
                                    <p className="text-sm text-[var(--text-secondary)] line-clamp-3">{meeting.agenda}</p>
                                </div>

                                {isManagerOrHR ? (
                                    <div className="flex justify-between items-center pt-4 border-t border-[var(--border-color)]">
                                        <div className="text-xs flex items-center gap-2">
                                            <button 
                                                id={`mail-btn-${meeting.id}`}
                                                onClick={() => handleSendMail(meeting.id)}
                                                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/10 text-indigo-500 font-bold hover:bg-indigo-500 hover:text-white rounded-lg transition-colors cursor-pointer"
                                            >
                                                <Mail className="w-3.5 h-3.5" /> Send Invite Mail
                                            </button>
                                        </div>
                                        {meeting.meetingLink && (
                                            <a href={meeting.meetingLink} target="_blank" rel="noopener noreferrer" className="px-4 py-1.5 bg-blue-500/10 text-blue-500 font-bold text-sm rounded-lg hover:bg-blue-500 hover:text-white transition-colors">
                                                Join Meeting
                                            </a>
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex justify-center items-center pt-4 border-t border-[var(--border-color)]">
                                        {(() => {
                                            const timeDiffMs = new Date(meeting.dateTime).getTime() - new Date().getTime();
                                            const isJoinActive = timeDiffMs <= 5 * 60 * 1000;
                                            return (
                                                <div className="w-full">
                                                    {isJoinActive && meeting.meetingLink ? (
                                                        <a 
                                                            href={meeting.meetingLink?.startsWith('http') ? meeting.meetingLink : `https://${meeting.meetingLink}`} 
                                                            target="_blank" 
                                                            rel="noopener noreferrer" 
                                                            className="flex items-center justify-center w-full px-4 py-2 bg-blue-600 hover:bg-blue-500 !text-white font-bold text-sm rounded-lg transition-colors shadow-md shadow-blue-500/20"
                                                        >
                                                            Join Now
                                                        </a>
                                                    ) : (
                                                        <button disabled className="flex items-center justify-center w-full px-4 py-2 bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] font-bold text-sm rounded-lg opacity-60 cursor-not-allowed">
                                                            {meeting.status === 'Canceled' ? 'Canceled' : 'Join Now (Active 5 mins before)'}
                                                        </button>
                                                    )}
                                                </div>
                                            );
                                        })()}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}

            {showModal && (
                <MeetingModal 
                    meeting={selectedMeeting} 
                    onClose={() => setShowModal(false)}
                    onSuccess={() => {
                        setShowModal(false);
                        fetchMeetings();
                    }}
                />
            )}
        </div>
    );
};

export default MeetingsPage;
