import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useSelector } from 'react-redux';
import { Search, Filter, History } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const EmployeeHistory = () => {
    const { user } = useSelector((state) => state.auth);
    const navigate = useNavigate();
    const [employees, setEmployees] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filters, setFilters] = useState({ departmentId: '' });
    const [departments, setDepartments] = useState([]);
    const [showFilters, setShowFilters] = useState(false);

    const fetchDeletedEmployees = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('/api/employees/history', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setEmployees(res.data);
        } catch (error) {
            console.error('Error fetching deleted employees:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchDepartments = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('/api/employees/departments', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setDepartments(res.data);
        } catch (error) {
            console.error('Error fetching departments:', error);
        }
    };

    useEffect(() => {
        fetchDeletedEmployees();
        fetchDepartments();
    }, []);

    const filteredEmployees = employees.filter(emp => {
        const matchesSearch = `${emp.firstName} ${emp.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
            emp.employeeId.toLowerCase().includes(searchTerm.toLowerCase()) ||
            emp.Department?.name?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesDept = !filters.departmentId || emp.departmentId === parseInt(filters.departmentId);

        return matchesSearch && matchesDept;
    });

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text-primary)]">Employee History Archive</h1>
                    <p className="text-[var(--text-secondary)] mt-1">
                        View permanent records of fully deleted employees and contractors.
                    </p>
                </div>
            </div>

            <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-2xl shadow-xl overflow-hidden transition-colors">
                {/* Filters */}
                <div className="p-4 border-b border-[var(--border-color)] flex flex-col gap-4 bg-[var(--bg-secondary)]/30">
                    <div className="flex flex-col md:flex-row gap-4 justify-between">
                        <div className="relative w-full md:w-96">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                            <input
                                type="text"
                                placeholder="Search archived names, IDs..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg py-2 pl-10 pr-4 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                            />
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                className={`flex items-center gap-2 px-4 py-2 border rounded-lg text-sm transition-all ${showFilters ? 'bg-blue-600 text-white border-blue-500' : 'bg-[var(--bg-secondary)] border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--hover-bg)]'}`}
                            >
                                <Filter className="w-4 h-4" />
                                {showFilters ? 'Hide Filters' : 'Filter'}
                            </button>
                        </div>
                    </div>

                    {showFilters && (
                        <div className="flex flex-wrap gap-4 pt-4 border-t border-[var(--border-color)] animate-in slide-in-from-top-2 duration-300">
                            <div className="flex-1 min-w-[200px]">
                                <label className="block text-[10px] font-bold text-[var(--text-secondary)] uppercase mb-1">Department</label>
                                <select
                                    className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-sm text-[var(--text-primary)]"
                                    value={filters.departmentId}
                                    onChange={(e) => setFilters({ ...filters, departmentId: e.target.value })}
                                >
                                    <option value="">All Departments</option>
                                    {departments.map(d => (
                                        <option key={d.id} value={d.id}>{d.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex items-end">
                                <button
                                    onClick={() => setFilters({ departmentId: '' })}
                                    className="px-4 py-2 text-sm text-blue-500 hover:text-blue-400 font-medium"
                                >
                                    Reset Filters
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                {/* Table */}
                <div className="overflow-x-auto standard-table">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-[var(--bg-secondary)] text-[var(--text-secondary)] text-xs uppercase tracking-wider">
                                <th className="px-6 py-4 font-semibold">Archived Employee</th>
                                <th className="px-6 py-4 font-semibold">Employee ID</th>
                                <th className="px-6 py-4 font-semibold">Department</th>
                                <th className="px-6 py-4 font-semibold">Designation</th>
                                <th className="px-6 py-4 font-semibold text-center">Deletion Date</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border-color)]">
                            {loading ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center text-slate-500">
                                        <div className="flex flex-col items-center gap-2">
                                            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                                            Retrieving archives...
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredEmployees.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-12 text-center text-slate-500">No deleted employee history found.</td>
                                </tr>
                            ) : (
                                filteredEmployees.map((emp) => (
                                    <tr key={emp.id} className="hover:bg-[var(--hover-bg)] transition-colors group">
                                        <td className="px-6 py-4">
                                            <div 
                                                className="flex items-center gap-3 cursor-pointer group/link hover:opacity-80 transition-opacity"
                                                onClick={() => navigate(`/employees/${emp.id}`)}
                                            >
                                                {emp.profilePicture ? (
                                                    <img src={emp.profilePicture.startsWith('http') ? emp.profilePicture : `/uploads/${emp.profilePicture}`} alt={`${emp.firstName} ${emp.lastName}`} className="w-10 h-10 rounded-xl object-cover border border-rose-500/30 grayscale group-hover/link:grayscale-0 transition-all shadow-sm" />
                                                ) : (
                                                    <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-500 font-bold border border-rose-500/30 transition-colors shadow-sm">
                                                        {emp.firstName?.[0]}{emp.lastName?.[0]}
                                                    </div>
                                                )}
                                                <div>
                                                    <p className="text-sm font-semibold text-[var(--text-primary)] group-hover/link:text-blue-500 transition-colors">{emp.firstName} {emp.lastName} <span className="ml-2 text-[10px] text-white bg-rose-500 px-2 py-0.5 rounded-full font-bold">DELETED</span></p>
                                                    <p className="text-xs text-[var(--text-secondary)]">{emp.User?.email}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td 
                                            className="px-6 py-4 text-sm text-slate-400 font-mono cursor-pointer hover:text-blue-400 transition-colors"
                                            onClick={() => navigate(`/employees/${emp.id}`)}
                                        >
                                            {emp.employeeId}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-slate-400">{emp.Department?.name || 'Unassigned'}</td>
                                        <td className="px-6 py-4 text-sm text-slate-400">{emp.designation}</td>
                                        <td className="px-6 py-4 text-sm text-slate-400 text-center font-semibold">
                                            {new Date(emp.deletedAt).toLocaleDateString()}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default EmployeeHistory;
