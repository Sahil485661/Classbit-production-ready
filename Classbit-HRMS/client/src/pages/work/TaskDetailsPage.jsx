import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import axios from 'axios';
import { useSelector } from 'react-redux';
import { 
    ArrowLeft, Clock, User, CheckCircle, Flag, Activity, AlignLeft, 
    Calendar, MessageSquare, Paperclip, Send, Download, UploadCloud, FileText, Image as ImageIcon
} from 'lucide-react';

const TaskDetailsPage = () => {
    const { id } = useParams();
    const { user } = useSelector((state) => state.auth);
    const [task, setTask] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [newComment, setNewComment] = useState('');
    const [submittingComment, setSubmittingComment] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [statusUpdating, setStatusUpdating] = useState(false);

    const fetchTaskDetails = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`/api/tasks/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setTask(res.data);
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.message || 'Failed to load task details');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTaskDetails();
    }, [id]);

    const handleAddComment = async (e) => {
        e.preventDefault();
        if (!newComment.trim()) return;
        setSubmittingComment(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.post(`/api/tasks/${id}/comments`, { text: newComment }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            // Update UI optimistically or softly
            setTask(prev => ({
                ...prev,
                TaskComments: [...(prev.TaskComments || []), res.data]
            }));
            setNewComment('');
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to add comment');
        } finally {
            setSubmittingComment(false);
        }
    };

    const handleStatusChange = async (newStatus) => {
        setStatusUpdating(true);
        try {
            const token = localStorage.getItem('token');
            await axios.patch(`/api/tasks/${id}/status`, { status: newStatus }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            // Re-fetch to get accurate activity logs synced
            fetchTaskDetails();
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to update status');
        } finally {
            setStatusUpdating(false);
        }
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('attachment', file);
        setUploading(true);

        try {
            const token = localStorage.getItem('token');
            await axios.post(`/api/tasks/${id}/attachments`, formData, {
                headers: { 
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                }
            });
            // Refresh entirely to sync activities + attachments
            fetchTaskDetails();
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to upload file');
        } finally {
            setUploading(false);
        }
    };

    if (loading && !task) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    if (error) {
        return <div className="text-red-500 text-center p-8 bg-[var(--card-bg)] rounded-xl border border-red-500/20">{error}</div>;
    }

    if (!task) return null;

    const getPriorityColor = (priority) => {
        switch (priority) {
            case 'Urgent': return 'bg-red-500/10 text-red-500 border-red-500/30';
            case 'High': return 'bg-orange-500/10 text-orange-500 border-orange-500/30';
            case 'Low': return 'bg-slate-500/10 text-slate-500 border-slate-500/30';
            default: return 'bg-blue-500/10 text-blue-500 border-blue-500/30';
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'Completed': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30';
            case 'In Progress': return 'bg-indigo-500/10 text-indigo-500 border-indigo-500/30';
            case 'Review': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/30';
            default: return 'bg-slate-500/10 text-slate-500 border-slate-500/30';
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pb-12 overflow-y-auto">
            <Link to="/work" className="inline-flex items-center text-sm font-bold text-blue-500 hover:text-blue-400 mt-4 transition-colors">
                <ArrowLeft className="w-4 h-4 mr-1" /> Back to Work Board
            </Link>

            <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-2xl shadow-xl p-8">
                {/* Header section */}
                <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-6 pb-6 border-b border-[var(--border-color)]">
                    <div>
                        <h1 className="text-2xl font-bold text-[var(--text-primary)]">{task.title}</h1>
                        <p className="text-sm text-[var(--text-secondary)] mt-2 flex items-center gap-4 flex-wrap">
                            <span className="flex items-center gap-1"><User className="w-4 h-4" /> Created by {task.Creator?.Employee?.firstName} {task.Creator?.Employee?.lastName}</span>
                            <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> Created on {new Date(task.createdAt).toLocaleDateString()}</span>
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <span className={`px-3 py-1 rounded-xl text-xs font-bold uppercase tracking-wider border ${getPriorityColor(task.priority)} flex items-center gap-1`}>
                            <Flag className="w-3 h-3" /> {task.priority}
                        </span>
                        <span className={`px-3 py-1 rounded-xl text-xs font-bold uppercase tracking-wider border ${getStatusColor(task.status)} flex items-center gap-1`}>
                            <CheckCircle className="w-3 h-3" /> {task.status}
                        </span>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    {/* Left Panel */}
                    <div className="md:col-span-2 space-y-8">
                        {/* Description */}
                        <div>
                            <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider mb-3 flex items-center gap-2"><AlignLeft className="w-4 h-4 text-blue-500" /> Description</h3>
                            <div className="p-5 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border-color)] text-sm text-[var(--text-secondary)] whitespace-pre-wrap leading-relaxed">
                                {task.description}
                            </div>
                        </div>

                        {/* Comments Section */}
                        <div>
                            <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider mb-3 flex items-center gap-2"><MessageSquare className="w-4 h-4 text-emerald-500" /> Discussion</h3>
                            
                            <div className="space-y-4 mb-4 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                {task.TaskComments && task.TaskComments.length > 0 ? (
                                    task.TaskComments.map(comment => (
                                        <div key={comment.id} className="flex gap-3">
                                            <div className="w-8 h-8 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center font-bold text-xs shrink-0">
                                                {comment.User?.Employee?.firstName?.[0] || 'U'}
                                            </div>
                                            <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl rounded-tl-none px-4 py-3 flex-1">
                                                <div className="flex justify-between items-center mb-1">
                                                    <span className="text-xs font-bold text-[var(--text-primary)]">{comment.User?.Employee?.firstName} {comment.User?.Employee?.lastName}</span>
                                                    <span className="text-[10px] text-[var(--text-muted)]">{new Date(comment.createdAt).toLocaleString()}</span>
                                                </div>
                                                <p className="text-sm text-[var(--text-secondary)] whitespace-pre-wrap">{comment.text}</p>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-xs text-[var(--text-muted)] italic py-2">No comments yet. Start the conversation!</p>
                                )}
                            </div>

                            <form onSubmit={handleAddComment} className="flex gap-2">
                                <input 
                                    type="text" 
                                    value={newComment}
                                    onChange={e => setNewComment(e.target.value)}
                                    placeholder="Write a comment..." 
                                    className="flex-1 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl px-4 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:border-blue-500"
                                />
                                <button 
                                    type="submit" 
                                    disabled={submittingComment || !newComment.trim()}
                                    className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white rounded-xl px-4 py-2 flex items-center gap-2 transition-colors"
                                >
                                    <Send className="w-4 h-4" />
                                </button>
                            </form>
                        </div>
                        
                        {/* Activity Log */}
                        <div>
                            <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider mb-3 flex items-center gap-2"><Activity className="w-4 h-4 text-indigo-500" /> Activity Log</h3>
                            <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-5 max-h-[300px] overflow-y-auto custom-scrollbar">
                                {task.TaskActivities && task.TaskActivities.length > 0 ? (
                                    <div className="space-y-4">
                                        {task.TaskActivities.map(activity => (
                                            <div key={activity.id} className="relative pl-6 pb-4 border-l border-[var(--border-color)] last:border-0 last:pb-0">
                                                <span className="absolute -left-[5px] top-1 w-2.5 h-2.5 rounded-full bg-blue-500 ring-4 ring-[var(--bg-secondary)]"></span>
                                                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-1 mb-1">
                                                    <span className="text-xs font-bold text-[var(--text-primary)]">{activity.action}</span>
                                                    <span className="text-[10px] text-[var(--text-muted)] flex items-center gap-1">
                                                        <Clock className="w-3 h-3" /> {new Date(activity.createdAt).toLocaleString()}
                                                    </span>
                                                </div>
                                                <p className="text-[11px] text-[var(--text-secondary)]">{activity.details}</p>
                                                <p className="text-[10px] text-blue-400 font-medium mt-1 uppercase">By {activity.User?.Employee?.firstName} {activity.User?.Employee?.lastName}</p>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-xs text-[var(--text-muted)] italic text-center p-4">No activity recorded yet.</p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Panel - Meta and Attachments */}
                    <div className="space-y-6">
                        <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-5 shadow-sm">
                            <h3 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-4 border-b border-[var(--border-color)] pb-2 flex items-center justify-between">
                                Task Meta
                                {statusUpdating && <span className="text-[10px] text-blue-500 animate-pulse">Updating...</span>}
                            </h3>
                            
                            <div className="space-y-4">
                                <div>
                                    <span className="text-[10px] uppercase text-[var(--text-muted)] font-bold block mb-1">Status</span>
                                    <select 
                                        className="w-full bg-[var(--card-bg)] border border-[var(--border-color)] rounded-lg px-2 py-1.5 text-sm font-semibold text-[var(--text-primary)] focus:outline-none focus:border-blue-500 disabled:opacity-50"
                                        value={task.status}
                                        onChange={(e) => handleStatusChange(e.target.value)}
                                        disabled={user.role === 'Employee' && task.status === 'Completed'}
                                    >
                                        <option value="Open">Open</option>
                                        <option value="In Progress">In Progress</option>
                                        <option value="Completed">Completed</option>
                                    </select>
                                </div>
                                <div>
                                    <span className="text-[10px] uppercase text-[var(--text-muted)] font-bold block mb-1">Deadline</span>
                                    <span className="text-sm font-semibold text-[var(--text-primary)]">{new Date(task.deadline).toLocaleDateString()}</span>
                                </div>
                                <div>
                                    <span className="text-[10px] uppercase text-[var(--text-muted)] font-bold block mb-1">Assignment Base</span>
                                    <span className="text-sm font-semibold text-[var(--text-primary)]">{task.assignmentType}</span>
                                </div>
                                <div>
                                    <span className="text-[10px] uppercase text-[var(--text-muted)] font-bold block mb-3">Assignees ({task.TaskAssignments?.length || 0})</span>
                                    <div className="flex flex-wrap gap-2">
                                        {task.TaskAssignments?.map(asg => (
                                            <div key={asg.id} title={`${asg.Employee?.firstName} ${asg.Employee?.lastName}`} className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 border-2 border-[var(--bg-secondary)] text-white text-[10px] font-bold uppercase shadow-sm">
                                                {asg.Employee?.firstName?.[0] || '?'}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Attachments UI */}
                        <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-5 shadow-sm">
                            <h3 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-4 border-b border-[var(--border-color)] pb-2 flex items-center justify-between">
                                <span className="flex items-center gap-1"><Paperclip className="w-3 h-3" /> Attachments ({task.TaskAttachments?.length || 0})</span>
                            </h3>

                            <div className="space-y-3">
                                <input 
                                    type="file" 
                                    id="side-upload" 
                                    className="hidden" 
                                    onChange={handleFileUpload} 
                                    disabled={uploading} 
                                />
                                <label htmlFor="side-upload" className={`flex items-center justify-center gap-2 w-full py-2 border border-dashed border-blue-500/50 rounded-lg text-xs font-bold text-blue-500 hover:bg-blue-500/10 transition-colors cursor-pointer ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
                                    <UploadCloud className="w-4 h-4" /> {uploading ? 'Uploading...' : 'Upload File'}
                                </label>

                                <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
                                    {(task.TaskAttachments || []).map(file => (
                                        <div key={file.id} className="bg-[var(--card-bg)] border border-[var(--border-color)] p-2 rounded-lg flex items-center justify-between group">
                                            <div className="flex items-center gap-2 overflow-hidden">
                                                <div className="w-8 h-8 bg-[var(--bg-secondary)] rounded flex items-center justify-center text-[var(--text-secondary)] shrink-0">
                                                    {file.fileType?.includes('image') ? <ImageIcon className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                                                </div>
                                                <div className="overflow-hidden">
                                                    <p className="text-[10px] font-bold text-[var(--text-primary)] truncate" title={file.originalName}>{file.originalName}</p>
                                                    <p className="text-[8px] text-[var(--text-secondary)]">{file.Uploader?.Employee?.firstName} • {new Date(file.createdAt).toLocaleDateString()}</p>
                                                </div>
                                            </div>
                                            <a 
                                                href={`${file.fileUrl}`} 
                                                target="_blank" 
                                                rel="noreferrer"
                                                className="p-1.5 text-blue-500 bg-blue-500/10 hover:bg-blue-500 hover:text-white rounded transition-colors opacity-0 group-hover:opacity-100"
                                            >
                                                <Download className="w-3 h-3" />
                                            </a>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                    </div>
                </div>

            </div>
        </div>
    );
};

export default TaskDetailsPage;
