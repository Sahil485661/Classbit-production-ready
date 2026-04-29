import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
    Plus, Search, Clock, AlertCircle,
    CheckCircle2, MessageSquare, Paperclip, MoreHorizontal, Download, UploadCloud, X, FileText, Image as ImageIcon, Users
} from 'lucide-react';
import Modal from '../../components/Modal';
import CreateTaskForm from './CreateTaskForm';
import EditTaskForm from './EditTaskForm';

const TaskBoard = () => {
    const { user } = useSelector((state) => state.auth);
    const navigate = useNavigate();
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState(null);
    const [activeDropdown, setActiveDropdown] = useState(null);
    
    // Attachment State
    const [isAttachmentModalOpen, setIsAttachmentModalOpen] = useState(false);
    const [selectedTask, setSelectedTask] = useState(null);
    const [attachments, setAttachments] = useState([]);
    const [uploading, setUploading] = useState(false);

    const fetchTasks = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('/api/tasks/my', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setTasks(res.data);
        } catch (error) {
            console.error('Error fetching tasks:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTasks();
        
        const handleClickOutside = (e) => {
            if (!e.target.closest('.task-dropdown-container')) {
                setActiveDropdown(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const updateTaskStatus = async (taskId, newStatus) => {
        try {
            const token = localStorage.getItem('token');
            await axios.patch(`/api/tasks/${taskId}/status`,
                { status: newStatus },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            fetchTasks();
        } catch (error) {
            alert('Failed to update status');
        }
    };

    const handleOpenAttachments = async (task) => {
        setSelectedTask(task);
        setIsAttachmentModalOpen(true);
        setAttachments(task.TaskAttachments || []);
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file || !selectedTask) return;

        const formData = new FormData();
        formData.append('attachment', file);

        setUploading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.post(`/api/tasks/${selectedTask.id}/attachments`, formData, {
                headers: { 
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                }
            });
            setAttachments([res.data, ...attachments]);
            fetchTasks(); // Refresh to update the paperclip count
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to upload file');
        } finally {
            setUploading(false);
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'Open': return 'bg-blue-500/10 text-blue-400 border-blue-500/20';
            case 'In Progress': return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
            case 'Completed': return 'bg-green-500/10 text-green-400 border-green-500/20';
            default: return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
        }
    };

    const getPriorityIcon = (priority) => {
        switch (priority) {
            case 'Urgent': return <AlertCircle className="w-4 h-4 text-red-500" />;
            case 'High': return <Clock className="w-4 h-4 text-orange-500" />;
            default: return <Clock className="w-4 h-4 text-blue-500" />;
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text-primary)]">Work Management</h1>
                    <p className="text-[var(--text-secondary)] mt-1">Track and manage project tasks and assignments.</p>
                </div>
                {(user.role === 'Super Admin' || user.role === 'HR' || user.role === 'Manager') && (
                    <button
                        onClick={() => setIsModalOpen(true)}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl font-semibold transition-all shadow-lg shadow-blue-900/20"
                    >
                        <Plus className="w-5 h-5" />
                        Create Task
                    </button>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Kanban Columns concept or List */}
                {['Open', 'In Progress', 'Completed'].map((column) => (
                    <div key={column} className="flex flex-col gap-4">
                        <div className="flex items-center justify-between px-2">
                            <h3 className="font-semibold text-[var(--text-secondary)] flex items-center gap-2 uppercase tracking-widest text-xs">
                                {column}
                                <span className="bg-[var(--card-bg)] text-[var(--text-secondary)] px-2 py-0.5 rounded-md text-[10px] border border-[var(--border-color)]">
                                    {tasks.filter(t => t.status === column).length}
                                </span>
                            </h3>
                        </div>

                        <div className="space-y-4 min-h-[500px] bg-[var(--bg-secondary)] p-3 rounded-2xl border border-dashed border-[var(--border-color)] transition-colors">
                            {loading ? (
                                <div className="p-8 text-center text-[var(--text-secondary)] italic">Loading tasks...</div>
                            ) : tasks.filter(t => t.status === column).length === 0 ? (
                                <div className="p-8 text-center text-[var(--text-secondary)] italic text-sm">No tasks in this stage.</div>
                            ) : (
                                tasks.filter(t => t.status === column).map((task) => (
                                    <div
                                        key={task.id}
                                        onClick={() => navigate(`/work/tasks/${task.id}`)}
                                        className="bg-[var(--card-bg)] border border-[var(--border-color)] p-5 rounded-2xl shadow-lg hover:border-blue-500/30 transition-all group cursor-pointer"
                                    >
                                        <div className="flex justify-between items-start mb-3">
                                            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border ${getStatusColor(task.status)} uppercase`}>
                                                {task.priority}
                                            </span>
                                            <div className="relative task-dropdown-container">
                                                <button 
                                                    className="text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setActiveDropdown(activeDropdown === task.id ? null : task.id);
                                                    }}
                                                >
                                                    <MoreHorizontal className="w-4 h-4" />
                                                </button>
                                                
                                                {activeDropdown === task.id && (
                                                    <div className="absolute top-full right-0 mt-2 w-36 bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl shadow-xl z-[9999] overflow-hidden text-left py-1">
                                                        {(user.role !== 'Employee' || task.createdBy === user.id) ? (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setEditingTask(task);
                                                                    setIsEditModalOpen(true);
                                                                    setActiveDropdown(null);
                                                                }}
                                                                className="w-full text-left px-4 py-2 text-sm font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] hover:text-blue-500 transition-colors"
                                                            >
                                                                Edit Task
                                                            </button>
                                                        ) : (
                                                            <div className="px-4 py-2 text-xs text-[var(--text-secondary)] italic">
                                                                No actions available
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <h4 className="text-[var(--text-primary)] font-semibold leading-tight group-hover:text-blue-400 transition-colors">
                                            {task.title}
                                        </h4>
                                        <p className="text-[var(--text-secondary)] text-xs mt-2 line-clamp-2">
                                            {task.description}
                                        </p>

                                        <div className="mt-6 flex items-center justify-between">
                                            <div className="flex -space-x-2 relative group">
                                                {task.assignmentType === 'All' || task.assignmentType === 'All Employees' ? (
                                                    <div className="flex items-center gap-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 px-3 py-1 rounded-full text-[10px] font-bold z-10">
                                                        <Users className="w-3 h-3" />
                                                        ALL EMPLOYEES
                                                    </div>
                                                ) : task.assignmentType === 'Department' || task.assignmentType === 'Entire Department' ? (
                                                    <div className="flex items-center gap-2 bg-purple-500/10 border border-purple-500/20 text-purple-400 px-3 py-1 rounded-full text-[10px] font-bold z-10">
                                                        <Users className="w-3 h-3" />
                                                        {task.AssignedDepartment ? `${task.AssignedDepartment.name.toUpperCase()} DEPT` : 'DEPARTMENT'}
                                                    </div>
                                                ) : (
                                                    <>
                                                        {task.TaskAssignments?.slice(0, 3).map((asg, i) => (
                                                            <div key={i} className="relative group/avatar">
                                                                <div className="w-8 h-8 rounded-full bg-[var(--bg-secondary)] border-2 border-[var(--card-bg)] flex items-center justify-center text-[10px] font-bold text-[var(--text-secondary)] uppercase hover:z-20 hover:scale-110 hover:border-blue-400 transition-all cursor-pointer">
                                                                    {asg.Employee?.firstName?.[0] || '?'}
                                                                </div>
                                                                {/* Hover Tooltip */}
                                                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max px-3 py-2 bg-[var(--text-primary)] text-[var(--bg-primary)] text-xs rounded-lg opacity-0 invisible group-hover/avatar:opacity-100 group-hover/avatar:visible transition-all shadow-xl z-50 pointer-events-none">
                                                                    <p className="font-bold">{asg.Employee?.firstName} {asg.Employee?.lastName}</p>
                                                                    <p className="opacity-70 text-[10px] border-t border-white/20 pt-1 mt-1">{asg.Employee?.designation || 'Employee'}</p>
                                                                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-[var(--text-primary)]"></div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                        {task.TaskAssignments?.length > 3 && (
                                                            <div className="w-8 h-8 rounded-full bg-[var(--bg-secondary)] border-2 border-[var(--card-bg)] flex items-center justify-center text-[10px] font-bold text-[var(--text-secondary)] z-10">
                                                                +{task.TaskAssignments.length - 3}
                                                            </div>
                                                        )}
                                                    </>
                                                )}
                                            </div>

                                            <div className="flex items-center gap-3 text-[var(--text-secondary)]">
                                                <div className="flex items-center gap-1 text-[10px]">
                                                    <MessageSquare className="w-3 h-3" />
                                                    <span>0</span>
                                                </div>
                                                <button 
                                                    onClick={(e) => { e.stopPropagation(); handleOpenAttachments(task); }}
                                                    className="flex items-center gap-1 text-[10px] hover:text-blue-400 transition-colors"
                                                    title="View Attachments"
                                                >
                                                    <Paperclip className="w-3 h-3" />
                                                    <span>{task.TaskAttachments?.length || 0}</span>
                                                </button>
                                            </div>
                                        </div>

                                        <div className="mt-4 pt-4 border-t border-[var(--border-color)] flex items-center justify-between">
                                            <div className="flex items-center gap-2 text-[10px] text-[var(--text-secondary)] font-medium">
                                                <Clock className="w-3 h-3" />
                                                <span>Deadline: {new Date(task.deadline).toLocaleDateString()}</span>
                                            </div>
                                            <select
                                                className="bg-transparent text-[10px] text-blue-400 font-bold focus:outline-none disabled:opacity-50"
                                                value={task.status}
                                                onClick={(e) => e.stopPropagation()}
                                                onChange={(e) => { e.stopPropagation(); updateTaskStatus(task.id, e.target.value); }}
                                                disabled={user.role === 'Employee' && task.status === 'Completed'}
                                            >
                                                {(user.role !== 'Employee' || task.status === 'Open') && (
                                                    <option value="Open">Open</option>
                                                )}
                                                <option value="In Progress">
                                                    {task.status === 'In Progress' ? 'In Progress' : 'Move to Progress'}
                                                </option>
                                                <option value="Completed">
                                                    {task.status === 'Completed' ? 'Completed' : 'Mark Completed'}
                                                </option>
                                            </select>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                ))}
            </div>

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Assign New Task">
                <CreateTaskForm
                    onSuccess={() => {
                        setIsModalOpen(false);
                        fetchTasks();
                    }}
                    onCancel={() => setIsModalOpen(false)}
                />
            </Modal>

            <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Task">
                {editingTask && (
                    <EditTaskForm
                        task={editingTask}
                        onSuccess={() => {
                            setIsEditModalOpen(false);
                            setEditingTask(null);
                            fetchTasks();
                        }}
                        onCancel={() => {
                            setIsEditModalOpen(false);
                            setEditingTask(null);
                        }}
                    />
                )}
            </Modal>

            {/* Attachments Modal */}
            <Modal isOpen={isAttachmentModalOpen} onClose={() => setIsAttachmentModalOpen(false)} title="Task Attachments">
                <div className="space-y-6">
                    {/* Upload Section */}
                    <div className="bg-[var(--bg-secondary)] border border-dashed border-[var(--border-color)] rounded-2xl p-6 text-center">
                        <input
                            type="file"
                            id="file-upload"
                            className="hidden"
                            onChange={handleFileUpload}
                            disabled={uploading}
                        />
                        <label 
                            htmlFor="file-upload" 
                            className={`cursor-pointer flex flex-col items-center gap-2 ${uploading ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105'} transition-transform`}
                        >
                            <div className="w-12 h-12 bg-blue-500/10 text-blue-500 rounded-full flex items-center justify-center">
                                <UploadCloud className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-sm font-semibold text-[var(--text-primary)]">
                                    {uploading ? 'Uploading...' : 'Click to Upload File'}
                                </p>
                                <p className="text-[10px] text-[var(--text-secondary)] mt-1">Images, PDFs, or Documents (Max 10MB)</p>
                            </div>
                        </label>
                    </div>

                    {/* File List */}
                    <div className="space-y-3">
                        <h4 className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">
                            Attached Files ({attachments.length})
                        </h4>
                        
                        {attachments.length === 0 ? (
                            <p className="text-sm text-[var(--text-secondary)] italic text-center p-4">No files attached to this task yet.</p>
                        ) : (
                            <div className="max-h-[300px] overflow-y-auto custom-scrollbar pr-2 space-y-2">
                                {attachments.map(file => (
                                    <div key={file.id} className="bg-[var(--card-bg)] border border-[var(--border-color)] p-3 rounded-xl flex items-center justify-between hover:border-blue-500/30 transition-colors">
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            <div className="w-10 h-10 bg-[var(--bg-secondary)] rounded-lg flex items-center justify-center text-[var(--text-secondary)] shrink-0">
                                                {file.fileType?.includes('image') ? <ImageIcon className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                                            </div>
                                            <div className="overflow-hidden">
                                                <p className="text-sm font-semibold text-[var(--text-primary)] truncate" title={file.originalName}>
                                                    {file.originalName}
                                                </p>
                                                <p className="text-[10px] text-[var(--text-secondary)]">
                                                    Uploaded by {file.Uploader?.Employee ? `${file.Uploader.Employee.firstName}` : 'Unknown'} • {new Date(file.createdAt).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>
                                        <a 
                                            href={`${file.fileUrl}`} 
                                            target="_blank" 
                                            rel="noreferrer"
                                            className="p-2 bg-blue-500/10 text-blue-500 hover:bg-blue-500 hover:text-white rounded-lg transition-all"
                                            title="Download File"
                                        >
                                            <Download className="w-4 h-4" />
                                        </a>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default TaskBoard;
