import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useSelector } from 'react-redux';
import { X, Users, RefreshCw } from 'lucide-react';
import Modal from '../../components/Modal';

const API = '/api';

const MeetingModal = ({ meeting, onClose, onSuccess }) => {
    const { token } = useSelector((state) => state.auth);
    const [loading, setLoading] = useState(false);
    
    // For Audience Selection
    const [departments, setDepartments] = useState([]);
    const [employees, setEmployees] = useState([]);
    
    const [formData, setFormData] = useState({
        title: meeting?.title || '',
        dateTime: meeting?.dateTime ? new Date(meeting.dateTime).toISOString().slice(0,16) : '',
        agenda: meeting?.agenda || '',
        meetingLink: meeting?.meetingLink || '',
        targetAudience: meeting?.targetAudience || { type: 'all', data: [] }
    });

    useEffect(() => {
        fetchDepartmentsAndEmployees();
    }, []);

    const fetchDepartmentsAndEmployees = async () => {
        try {
            const [deptRes, empRes] = await Promise.all([
                axios.get(`${API}/dashboard/departments`, { headers: { Authorization: `Bearer ${token}` } }),
                // Using employee list endpoint, adjust if needed
                axios.get(`${API}/employees`, { headers: { Authorization: `Bearer ${token}` } })
            ]);
            setDepartments(deptRes.data);
            setEmployees(empRes.data.employees || empRes.data || []);
        } catch (error) {
            console.error('Failed to load audience data', error);
        }
    };

    const handleAudienceChange = (type) => {
        setFormData(prev => ({
            ...prev,
            targetAudience: { type, data: [] }
        }));
    };

    const handleAudienceDataToggle = (id) => {
        setFormData(prev => {
            const newData = prev.targetAudience.data.includes(id)
                ? prev.targetAudience.data.filter(item => item !== id)
                : [...prev.targetAudience.data, id];
            return {
                ...prev,
                targetAudience: { ...prev.targetAudience, data: newData }
            };
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            if (meeting) {
                await axios.put(`${API}/meetings/${meeting.id}`, formData, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            } else {
                await axios.post(`${API}/meetings`, formData, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            }
            onSuccess();
        } catch (error) {
            console.error('Submission failed', error);
            if (error.response) {
                alert(`Error: ${error.response.data.message || error.response.statusText}`);
            } else {
                alert(`Error: ${error.message}`);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <Modal isOpen={true} onClose={onClose} title={meeting ? "Edit Meeting" : "Schedule New Meeting"}>
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    <div className="space-y-2 md:col-span-2">
                        <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wide">Meeting Title</label>
                        <input
                            type="text"
                            required
                            value={formData.title}
                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                            className="w-full bg-[var(--bg-primary)] text-[var(--text-primary)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all font-medium"
                            placeholder="e.g. Weekly Sync"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wide">Date & Time</label>
                        <input
                            type="datetime-local"
                            required
                            value={formData.dateTime}
                            onChange={e => setFormData({ ...formData, dateTime: e.target.value })}
                            className="w-full bg-[var(--bg-primary)] text-[var(--text-primary)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all font-medium"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wide">Meeting Link (Zoom/Meet)</label>
                        <input
                            type="url"
                            value={formData.meetingLink}
                            onChange={e => setFormData({ ...formData, meetingLink: e.target.value })}
                            className="w-full bg-[var(--bg-primary)] text-[var(--text-primary)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all font-medium"
                            placeholder="https://..."
                        />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                        <label className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wide">Agenda</label>
                        <textarea
                            rows="2"
                            value={formData.agenda}
                            onChange={e => setFormData({ ...formData, agenda: e.target.value })}
                            className="w-full bg-[var(--bg-primary)] text-[var(--text-primary)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all font-medium resize-none"
                            placeholder="Brief description of discussion points..."
                        ></textarea>
                    </div>

                    <div className="space-y-3 md:col-span-2 pt-4 border-t border-[var(--border-color)]">
                        <label className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                            <Users className="w-4 h-4 text-blue-500" /> Target Audience
                        </label>
                        
                        <div className="flex gap-4 mb-3">
                            {['all', 'departments', 'employees'].map(type => (
                                <label key={type} className="flex items-center gap-2 text-sm text-[var(--text-secondary)] cursor-pointer">
                                    <input 
                                        type="radio" 
                                        name="targetType" 
                                        checked={formData.targetAudience.type === type}
                                        onChange={() => handleAudienceChange(type)}
                                        className="w-4 h-4 text-blue-600 border-[var(--border-color)] focus:ring-blue-500"
                                    />
                                    <span className="capitalize">{type}</span>
                                </label>
                            ))}
                        </div>

                        {formData.targetAudience.type === 'departments' && (
                            <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 mt-2 bg-[var(--bg-primary)] p-3 rounded-xl border border-[var(--border-color)] max-h-32 overflow-y-auto">
                                {departments.map(dept => (
                                    <label key={dept.id} className="flex items-center gap-2 text-xs text-[var(--text-primary)] cursor-pointer hover:bg-blue-500/10 p-1 rounded transition-colors">
                                        <input 
                                            type="checkbox" 
                                            checked={formData.targetAudience.data.includes(dept.id)}
                                            onChange={() => handleAudienceDataToggle(dept.id)}
                                            className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-blue-500"
                                        />
                                        {dept.name}
                                    </label>
                                ))}
                            </div>
                        )}

                        {formData.targetAudience.type === 'employees' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2 bg-[var(--bg-primary)] p-3 rounded-xl border border-[var(--border-color)] max-h-40 overflow-y-auto">
                                {employees.map(emp => (
                                    <label key={emp.id} className="flex items-center gap-2 text-xs text-[var(--text-primary)] cursor-pointer hover:bg-blue-500/10 p-1 rounded transition-colors truncate">
                                        <input 
                                            type="checkbox" 
                                            checked={formData.targetAudience.data.includes(emp.id)}
                                            onChange={() => handleAudienceDataToggle(emp.id)}
                                            className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-blue-500 flex-shrink-0"
                                        />
                                        {emp.firstName} {emp.lastName} ({emp.employeeId})
                                    </label>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                <div className="flex justify-end gap-3 pt-6">
                    <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-lg text-sm font-bold text-[var(--text-secondary)] hover:bg-[var(--hover-bg)] transition-colors">
                        Cancel
                    </button>
                    <button disabled={loading} type="submit" className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-lg transition-colors shadow-lg shadow-blue-500/20 disabled:opacity-50">
                        {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : 'Save Meeting'}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default MeetingModal;
