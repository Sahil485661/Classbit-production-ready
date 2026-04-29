import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Type, AlignLeft, Calendar,
    Flag, Users, Paperclip
} from 'lucide-react';

const CreateTaskForm = ({ onSuccess, onCancel }) => {
    const [formData, setFormData] = useState({
        title: '',
        description: '',
        deadline: '',
        priority: 'Medium',
        assignmentType: 'Single Employee',
        employeeIds: [],
        departmentId: '',
    });

    const [employees, setEmployees] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const token = localStorage.getItem('token');
                const headers = { Authorization: `Bearer ${token}` };
                const [eRes, dRes] = await Promise.all([
                    axios.get('/api/employees', { headers }),
                    axios.get('/api/employees/departments', { headers })
                ]);
                setEmployees(eRes.data);
                setDepartments(dRes.data);
            } catch (err) {
                console.error('Failed to fetch data', err);
            }
        };
        fetchData();
    }, []);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            await axios.post('/api/tasks', { ...formData, assigneeIds: formData.employeeIds }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            onSuccess();
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to create task');
        } finally {
            setLoading(false);
        }
    };

    const inputClass = "w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl py-2.5 px-4 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm";
    const labelClass = "text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-1.5 block ml-1";

    return (
        <form onSubmit={handleSubmit} className="space-y-6 text-left">
            <div>
                <label className={labelClass}>Task Title</label>
                <div className="relative">
                    <Type className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]" />
                    <input
                        type="text"
                        required
                        placeholder="e.g. Finish quarterly reports"
                        className={`${inputClass} pl-10`}
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    />
                </div>
            </div>

            <div>
                <label className={labelClass}>Description</label>
                <textarea
                    required
                    rows="3"
                    className={inputClass}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className={labelClass}>Deadline</label>
                    <div className="relative">
                        <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                            type="date"
                            required
                            className={`${inputClass} pl-10`}
                            value={formData.deadline}
                            onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                        />
                    </div>
                </div>
                <div>
                    <label className={labelClass}>Priority</label>
                    <div className="relative">
                        <Flag className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <select
                            required
                            className={`${inputClass} pl-10 appearance-none`}
                            value={formData.priority}
                            onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                        >
                            <option value="Low">Low</option>
                            <option value="Medium">Medium</option>
                            <option value="High">High</option>
                            <option value="Urgent">Urgent</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="border-t border-slate-800 pt-6">
                <label className={labelClass}>Assignment Logic</label>
                <div className="grid grid-cols-2 gap-4">
                    <select
                        className={inputClass}
                        value={formData.assignmentType}
                        onChange={(e) => setFormData({ ...formData, assignmentType: e.target.value, employeeIds: [], departmentId: '' })}
                    >
                        <option value="Single Employee">Single Employee</option>
                        <option value="Multiple Employees">Multiple Employees</option>
                        <option value="Entire Department">Entire Department</option>
                        <option value="All Employees">All Employees</option>
                    </select>

                    {formData.assignmentType === 'Single Employee' && (
                        <select
                            required
                            className={inputClass}
                            value={formData.employeeIds[0] || ''}
                            onChange={(e) => setFormData({ ...formData, employeeIds: [e.target.value] })}
                        >
                            <option value="">Select Employee</option>
                            {employees.map(e => <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>)}
                        </select>
                    )}

                    {formData.assignmentType === 'Entire Department' && (
                        <select
                            required
                            className={inputClass}
                            value={formData.departmentId}
                            onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                        >
                            <option value="">Select Department</option>
                            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                        </select>
                    )}

                    {formData.assignmentType === 'Multiple Employees' && (
                        <div className="space-y-2">
                            <p className="text-[10px] text-blue-400 font-bold uppercase tracking-wider">Hold Ctrl to select multiple</p>
                            <select
                                multiple
                                required
                                className={`${inputClass} h-32 py-2`}
                                value={formData.employeeIds}
                                onChange={(e) => {
                                    const values = Array.from(e.target.selectedOptions, option => option.value);
                                    setFormData({ ...formData, employeeIds: values });
                                }}
                            >
                                {employees.map(e => <option key={e.id} value={e.id}>{e.firstName} {e.lastName}</option>)}
                            </select>
                        </div>
                    )}
                </div>
            </div>

            <div className="flex justify-end gap-3 mt-8">
                <button type="button" onClick={onCancel} className="px-6 py-2.5 text-slate-400 font-semibold hover:text-slate-200 transition-colors">Cancel</button>
                <button
                    type="submit"
                    disabled={loading}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-2.5 rounded-xl font-bold shadow-lg shadow-blue-900/20 flex items-center gap-2"
                >
                    {loading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                    {loading ? 'Creating...' : 'Assign Task'}
                </button>
            </div>
        </form>
    );
};

export default CreateTaskForm;
