import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Bell, Plus, Trash2, Calendar,
    Type, AlignLeft, AlertCircle, Quote as QuoteIcon,
    Megaphone, CheckCircle2, X, Edit
} from 'lucide-react';
import { useSelector } from 'react-redux';

const NoticeManagement = () => {
    const [notices, setNotices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [settings, setSettings] = useState({ eventAdminDesignations: '' });
    const [savingSettings, setSavingSettings] = useState(false);
    const [formData, setFormData] = useState({
        type: 'Announcement',
        title: '',
        content: '',
        expiryDate: '',
        eventDate: '',
        isActive: true
    });
    
    // Determine if the user is authorized to create/edit notices
    const { user } = useSelector((state) => state.auth);
    const canManageNotices = user?.role === 'Super Admin' || user?.role === 'HR' || user?.role === 'Manager';

    const fetchNotices = async () => {
        try {
            const token = localStorage.getItem('token');
            const headers = { Authorization: `Bearer ${token}` };
            const noticesRes = await axios.get('/api/notices', { headers });
            setNotices(noticesRes.data);
        } catch (error) {
            console.error('Error fetching notices:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchNotices();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            const payload = { ...formData, eventDate: formData.eventDate || null, expiryDate: formData.expiryDate || null };
            
            if (isEditing) {
                await axios.put(`/api/notices/${editingId}`, payload, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            } else {
                await axios.post('/api/notices', payload, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            }
            setShowModal(false);
            setFormData({ type: 'Announcement', title: '', content: '', expiryDate: '', eventDate: '', isActive: true });
            setIsEditing(false);
            setEditingId(null);
            fetchNotices();
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to save notice');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this notice?')) return;
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`/api/notices/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            fetchNotices();
        } catch (error) {
            alert('Failed to delete notice');
        }
    };

    const openEditModal = (notice) => {
        setIsEditing(true);
        setEditingId(notice.id);
        setFormData({
            type: notice.type || 'Announcement',
            title: notice.title || '',
            content: notice.content || '',
            expiryDate: notice.expiryDate ? new Date(notice.expiryDate).toISOString().split('T')[0] : '',
            eventDate: notice.eventDate ? new Date(notice.eventDate).toISOString().split('T')[0] : '',
            isActive: notice.isActive !== undefined ? notice.isActive : true
        });
        setShowModal(true);
    };

    const getTypeIcon = (type) => {
        switch (type) {
            case 'Announcement': return Megaphone;
            case 'Quote': return QuoteIcon;
            case 'Notice': return AlertCircle;
            default: return Bell;
        }
    };

    const getTypeColor = (type) => {
        switch (type) {
            case 'Announcement': return 'text-blue-400 bg-blue-400/10';
            case 'Quote': return 'text-purple-400 bg-purple-400/10';
            case 'Notice': return 'text-amber-400 bg-amber-400/10';
            default: return 'text-slate-400 bg-slate-400/10';
        }
    };

    return (
        <div className="space-y-6">

            <div className="flex justify-between items-center text-left pt-2">
                <div>
                    <h2 className="text-2xl font-bold text-[var(--text-primary)] italic">Global Notice Board</h2>
                    <p className="text-sm text-[var(--text-secondary)] mt-1">Stay updated with company announcements, daily quotes, and pinpoint events.</p>
                </div>
                {canManageNotices && (
                    <button
                        onClick={() => {
                            setIsEditing(false);
                            setEditingId(null);
                            setFormData({ type: 'Announcement', title: '', content: '', expiryDate: '', eventDate: '', isActive: true });
                            setShowModal(true);
                        }}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-2xl flex items-center gap-2 font-bold transition-all shadow-lg shadow-blue-900/20"
                    >
                        <Plus className="w-4 h-4" />
                        Create Notice
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {loading ? (
                    <div className="col-span-2 text-center py-12 text-[var(--text-secondary)] italic">Loading notices...</div>
                ) : notices.length === 0 ? (
                    <div className="col-span-2 text-center py-12 text-[var(--text-secondary)] italic border border-dashed border-[var(--border-color)] rounded-3xl">
                        No active notices found. Create one to get started.
                    </div>
                ) : (
                    notices.map((notice) => {
                        const Icon = getTypeIcon(notice.type);
                        return (
                            <div key={notice.id} className="bg-[var(--bg-secondary)]/30 border border-[var(--border-color)] p-6 rounded-3xl hover:border-blue-500/30 transition-all group relative overflow-hidden">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-2.5 rounded-xl ${getTypeColor(notice.type)}`}>
                                            <Icon className="w-5 h-5" />
                                        </div>
                                        <div className="text-left">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-secondary)] opacity-50">{notice.type}</span>
                                            <h4 className="font-bold text-[var(--text-primary)]">{notice.title || 'Broadcast Message'}</h4>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        {canManageNotices && (
                                            <>
                                                <button onClick={() => openEditModal(notice)} className="text-slate-600 hover:text-blue-500 transition-colors p-2" title="Edit Notice">
                                                    <Edit className="w-4 h-4" />
                                                </button>
                                                <button onClick={() => handleDelete(notice.id)} className="text-slate-600 hover:text-red-500 transition-colors p-2" title="Delete Notice">
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </>
                                        )}
                                    </div>
                                </div>
                                <p className="text-sm text-[var(--text-secondary)] line-clamp-3 text-left leading-relaxed">{notice.content}</p>
                                <div className="mt-6 flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-[10px] font-bold text-slate-500 uppercase tracking-tighter">
                                        <Calendar className="w-3 h-3" />
                                        Posted: {new Date(notice.createdAt).toLocaleDateString()}
                                    </div>
                                    {notice.expiryDate && (
                                        <div className="flex items-center gap-2 text-[10px] font-bold text-amber-500/70 uppercase tracking-tighter">
                                            Expires: {new Date(notice.expiryDate).toLocaleDateString()}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Create Modal */}
            {showModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-[var(--card-bg)] border border-[var(--border-color)] w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="p-6 border-b border-[var(--border-color)] flex justify-between items-center">
                            <h3 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
                                <Megaphone className="w-5 h-5 text-blue-500" />
                                {isEditing ? 'Edit System Notice' : 'New System Notice'}
                            </h3>
                            <button onClick={() => {
                                setShowModal(false);
                                setIsEditing(false);
                                setEditingId(null);
                                setFormData({ type: 'Announcement', title: '', content: '', expiryDate: '', eventDate: '', isActive: true });
                            }} className="text-slate-500 hover:text-[var(--text-primary)] transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-8 space-y-6 text-left">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-2 block">Notice Type</label>
                                    <select
                                        className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                        value={formData.type}
                                        onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                    >
                                        <option value="Announcement">Announcement</option>
                                        <option value="Notice">Notice</option>
                                        <option value="Quote">Daily Quote</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-2 block">Expiry (Optional)</label>
                                    <input
                                        type="date"
                                        className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                        value={formData.expiryDate}
                                        onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                                    />
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-2 block">Link to Event Date (Optional)</label>
                                    <input
                                        type="date"
                                        className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                        value={formData.eventDate}
                                        onChange={(e) => setFormData({ ...formData, eventDate: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-2 block">Subject / Title</label>
                                <div className="relative">
                                    <Type className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                    <input
                                        type="text"
                                        required
                                        placeholder="e.g. Office Closure Notice"
                                        className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl pl-12 pr-4 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-2 block">Rich Content</label>
                                <textarea
                                    required
                                    rows="4"
                                    placeholder="Write your announcement details here..."
                                    className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                    value={formData.content}
                                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                                />
                            </div>

                            <div className="flex justify-end gap-3 pt-4">
                                <button onClick={() => {
                                    setShowModal(false);
                                    setIsEditing(false);
                                    setEditingId(null);
                                    setFormData({ type: 'Announcement', title: '', content: '', expiryDate: '', eventDate: '', isActive: true });
                                }} type="button" className="px-5 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-800 rounded-xl transition-colors">Cancel</button>
                                <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-2.5 rounded-xl font-bold shadow-lg shadow-blue-900/20 flex items-center gap-2">
                                    <CheckCircle2 className="w-4 h-4" />
                                    {isEditing ? 'Update Notice' : 'Publish Notice'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default NoticeManagement;
