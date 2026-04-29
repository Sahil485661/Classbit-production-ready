import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Building, Plus, Trash2, Edit3, Briefcase } from 'lucide-react';

const DepartmentManagement = () => {
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [newDept, setNewDept] = useState({ name: '', description: '' });
    const [showAdd, setShowAdd] = useState(false);

    const fetchDepartments = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('/api/employees/departments', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setDepartments(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDepartments();
    }, []);

    const handleAddDept = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            await axios.post('/api/employees/departments', newDept, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setNewDept({ name: '', description: '' });
            setShowAdd(false);
            fetchDepartments();
        } catch (err) {
            alert('Failed to add department');
        }
    };

    return (
        <div className="space-y-6 text-left">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-[var(--text-primary)] italic">Organizational Structure</h2>
                <button
                    onClick={() => setShowAdd(!showAdd)}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2"
                >
                    <Plus className="w-4 h-4" />
                    Add Department
                </button>
            </div>

            {showAdd && (
                <form onSubmit={handleAddDept} className="bg-[var(--bg-secondary)] border border-[var(--border-color)] p-6 rounded-2xl">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-bold text-[var(--text-secondary)] uppercase block mb-2">Dept Name</label>
                            <input
                                type="text"
                                required
                                className="w-full bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                value={newDept.name}
                                onChange={(e) => setNewDept({ ...newDept, name: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-[var(--text-secondary)] uppercase block mb-2">Description</label>
                            <input
                                type="text"
                                className="w-full bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                value={newDept.description}
                                onChange={(e) => setNewDept({ ...newDept, description: e.target.value })}
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 mt-4">
                        <button type="button" onClick={() => setShowAdd(false)} className="text-[var(--text-secondary)] font-bold px-4">Cancel</button>
                        <button type="submit" className="bg-green-600 hover:bg-green-500 text-white px-6 py-2 rounded-xl font-bold">Save Dept</button>
                    </div>
                </form>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {loading ? (
                    <p className="text-[var(--text-secondary)] italic">Syncing structure...</p>
                ) : departments.map(dept => (
                    <div key={dept.id} className="bg-[var(--card-bg)] border border-[var(--border-color)] p-5 rounded-2xl hover:border-blue-500/30 transition-all group relative transition-colors">
                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-400">
                                <Briefcase className="w-6 h-6" />
                            </div>
                            <div>
                                <h4 className="font-bold text-[var(--text-primary)]">{dept.name}</h4>
                                <p className="text-xs text-[var(--text-secondary)] mt-1">{dept.description || 'Core business unit.'}</p>
                                <div className="mt-4 text-[10px] text-[var(--text-secondary)] font-bold uppercase tracking-widest opacity-50">
                                    Department Code: {dept.name.substring(0, 3).toUpperCase()}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default DepartmentManagement;
