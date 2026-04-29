import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Shield, Plus, Trash2, Edit3, CheckCircle2 } from 'lucide-react';

const PERMISSIONS = [
    'Dashboard', 'Employees', 'Attendance', 'Payroll', 'Leaves', 
    'Loans', 'Grievances', 'Messages', 'Tasks', 
    'Reimbursements', 'Settings', 'Compliance', 'Accounting'
];

const RoleManagement = () => {
    const [roles, setRoles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [roleForm, setRoleForm] = useState({ id: null, name: '', description: '', permissions: [] });
    const [showAdd, setShowAdd] = useState(false);

    const fetchRoles = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('/api/employees/roles', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setRoles(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRoles();
    }, []);

    const handleSaveRole = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            const dataToSave = { ...roleForm };
            
            if (roleForm.id) {
                await axios.put(`/api/employees/roles/${roleForm.id}`, dataToSave, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            } else {
                await axios.post('/api/employees/roles', dataToSave, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            }
            
            setRoleForm({ id: null, name: '', description: '', permissions: [] });
            setShowAdd(false);
            fetchRoles();
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to save role');
        }
    };

    const editRole = (role) => {
        const parsedPerms = typeof role.permissions === 'string' ? JSON.parse(role.permissions) : (role.permissions || []);
        setRoleForm({
            id: role.id,
            name: role.name,
            description: role.description || '',
            permissions: parsedPerms
        });
        setShowAdd(true);
    };

    const togglePermission = (perm) => {
        setRoleForm(prev => {
            const current = prev.permissions;
            if (current.includes(perm)) {
                return { ...prev, permissions: current.filter(p => p !== perm) };
            } else {
                return { ...prev, permissions: [...current, perm] };
            }
        });
    };

    return (
        <div className="space-y-6 text-left">
            <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-[var(--text-primary)] italic">Access Control Roles</h2>
                <button
                    onClick={() => {
                        setRoleForm({ id: null, name: '', description: '', permissions: [] });
                        setShowAdd(!showAdd);
                    }}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2"
                >
                    <Plus className="w-4 h-4" />
                    Create New Role
                </button>
            </div>

            {showAdd && (
                <form onSubmit={handleSaveRole} className="bg-[var(--bg-secondary)] border border-[var(--border-color)] p-6 rounded-2xl animate-in slide-in-from-top-4 duration-300">
                    <div className="flex items-center justify-between mb-4 border-b border-[var(--border-color)] pb-3">
                        <h3 className="text-lg font-bold text-[var(--text-primary)]">{roleForm.id ? 'Edit Role Permissions' : 'Create New Role'}</h3>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <div>
                            <label className="text-xs font-bold text-[var(--text-secondary)] uppercase block mb-2">Role Name</label>
                            <input
                                type="text"
                                required
                                disabled={roleForm.name === 'Super Admin'}
                                className="w-full bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-50"
                                value={roleForm.name}
                                onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="text-xs font-bold text-[var(--text-secondary)] uppercase block mb-2">Description</label>
                            <input
                                type="text"
                                className="w-full bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                value={roleForm.description}
                                onChange={(e) => setRoleForm({ ...roleForm, description: e.target.value })}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-bold text-[var(--text-secondary)] uppercase block mb-3">Module Access Permissions</label>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                            {PERMISSIONS.map(perm => {
                                const isSuper = roleForm.name === 'Super Admin';
                                const checked = isSuper || roleForm.permissions.includes(perm);
                                return (
                                    <label key={perm} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                                        checked ? 'bg-blue-500/10 border-blue-500/50' : 'bg-[var(--card-bg)] border-[var(--border-color)] hover:border-blue-500/30'
                                    }`}>
                                        <div className={`w-5 h-5 rounded flex items-center justify-center transition-colors border ${
                                            checked ? 'bg-blue-500 border-blue-500' : 'border-[var(--border-color)] bg-transparent'
                                        }`}>
                                            {checked && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
                                        </div>
                                        <span className={`text-sm font-semibold ${checked ? 'text-blue-500' : 'text-[var(--text-primary)]'}`}>
                                            {perm}
                                        </span>
                                        <input
                                            type="checkbox"
                                            className="hidden"
                                            checked={checked}
                                            disabled={isSuper}
                                            onChange={() => togglePermission(perm)}
                                        />
                                    </label>
                                );
                            })}
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-[var(--border-color)]">
                        <button type="button" onClick={() => setShowAdd(false)} className="text-[var(--text-secondary)] font-bold px-4 hover:bg-[var(--hover-bg)] py-2 rounded-xl transition-colors">Cancel</button>
                        <button type="submit" className="bg-green-600 hover:bg-green-500 text-white px-6 py-2 rounded-xl font-bold shadow-lg shadow-green-900/20">{roleForm.id ? 'Save Changes' : 'Create Role'}</button>
                    </div>
                </form>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {loading ? (
                    <p className="text-[var(--text-secondary)] italic">Syncing roles...</p>
                ) : roles.map(role => (
                    <div key={role.id} className="flex flex-col bg-[var(--card-bg)] border border-[var(--border-color)] p-5 rounded-2xl hover:border-blue-500/30 transition-all group relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                            <button onClick={() => editRole(role)} className="text-[var(--text-secondary)] hover:text-blue-400 p-1"><Edit3 className="w-4 h-4" /></button>
                            {role.name !== 'Super Admin' && <button className="text-[var(--text-secondary)] hover:text-red-400 p-1"><Trash2 className="w-4 h-4" /></button>}
                        </div>
                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-blue-500/10 rounded-xl text-blue-400">
                                <Shield className="w-6 h-6" />
                            </div>
                            <div>
                                <h4 className="font-bold text-[var(--text-primary)]">{role.name}</h4>
                                <p className="text-xs text-[var(--text-secondary)] mt-1 leading-relaxed">{role.description || 'Global system permission set.'}</p>
                                <div className="mt-3 flex items-center gap-2">
                                    <span className="text-[10px] bg-[var(--bg-secondary)] text-green-400 px-2 py-0.5 rounded-full font-bold uppercase tracking-tighter">Active</span>
                                </div>
                            </div>
                        </div>
                        {/* Display Permissions Tags */}
                        <div className="mt-4 pt-4 border-t border-[var(--border-color)] flex flex-wrap gap-1.5">
                            {role.name === 'Super Admin' ? (
                                <span className="text-[9px] bg-red-500/10 text-red-500 px-2 py-1 rounded border border-red-500/20 font-bold uppercase">All Modules (Unrestricted)</span>
                            ) : (() => {
                                const p = typeof role.permissions === 'string' ? JSON.parse(role.permissions) : (role.permissions || []);
                                if (p.length === 0) return <span className="text-[10px] text-[var(--text-secondary)] italic">No module access</span>;
                                return p.map(perm => (
                                    <span key={perm} className="text-[9px] bg-[var(--bg-secondary)] text-[var(--text-secondary)] px-2 py-1 rounded border border-[var(--border-color)] font-bold uppercase">
                                        {perm}
                                    </span>
                                ));
                            })()}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default RoleManagement;
