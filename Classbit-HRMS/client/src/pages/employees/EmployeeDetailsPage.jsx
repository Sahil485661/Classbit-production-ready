import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useSelector } from 'react-redux';
import {
    ArrowLeft, User, Mail, Phone, Briefcase, Calendar,
    MapPin, Flag, FileText, CreditCard, DollarSign,
    Clock, Users, Database, ShieldAlert, Heart, Activity,
    Plus, Trash2, Save, Edit3, TrendingUp, TrendingDown,
    IndianRupee, ChevronDown, ChevronUp, KeyRound
} from 'lucide-react';

const API = '/api';

const fmt = (n) => n ? `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—';

// ─── Salary Structure Editor ─────────────────────
const SalaryStructurePanel = ({ employee }) => {
    const { user } = useSelector((s) => s.auth);
    const canEdit = ['Super Admin', 'HR', 'Manager'].includes(user?.role);

    const [structure, setStructure]   = useState(null);
    const [isEditing, setIsEditing]   = useState(false);
    const [loading, setLoading]       = useState(true);
    const [saving, setSaving]         = useState(false);
    const [form, setForm]             = useState({
        baseSalary: '',
        payType: 'Monthly',
        currency: 'INR',
        allowances: {},
        deductions: {}
    });

    const token   = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };

    useEffect(() => {
        const fetch = async () => {
            try {
                const res = await axios.get(`${API}/salary/${employee.id}`, { headers });
                if (res.data) {
                    // Fix MySQL JSON stringification
                    let parsedAllowances = res.data.allowances || {};
                    let parsedDeductions = res.data.deductions || {};
                    if (typeof parsedAllowances === 'string') parsedAllowances = JSON.parse(parsedAllowances);
                    if (typeof parsedDeductions === 'string') parsedDeductions = JSON.parse(parsedDeductions);

                    setStructure({
                        ...res.data,
                        allowances: parsedAllowances,
                        deductions: parsedDeductions
                    });
                    setForm({
                        baseSalary: res.data.baseSalary || '',
                        payType: res.data.payType || 'Monthly',
                        currency: res.data.currency || 'INR',
                        allowances: parsedAllowances,
                        deductions: parsedDeductions
                    });
                }
            } catch (e) { console.error(e); }
            finally { setLoading(false); }
        };
        fetch();
    }, [employee.id]);

    const addEntry = (type) => {
        const key = prompt(`Enter ${type === 'allowances' ? 'Allowance' : 'Deduction'} name (e.g. HRA, PF):`);
        if (!key?.trim()) return;
        setForm(f => ({ ...f, [type]: { ...f[type], [key.trim()]: '' } }));
    };

    const removeEntry = (type, key) => {
        const updated = { ...form[type] };
        delete updated[key];
        setForm(f => ({ ...f, [type]: updated }));
    };

    const handleSave = async () => {
        if (!form.baseSalary) return alert('Base salary is required.');
        setSaving(true);
        try {
            const res = await axios.post(`${API}/salary/${employee.id}`, {
                ...form,
                baseSalary: parseFloat(form.baseSalary),
                allowances: Object.fromEntries(Object.entries(form.allowances).map(([k,v]) => [k, parseFloat(v) || 0])),
                deductions: Object.fromEntries(Object.entries(form.deductions).map(([k,v]) => [k, parseFloat(v) || 0]))
            }, { headers });
            setStructure(res.data);
            setIsEditing(false);
        } catch (e) {
            alert(e.response?.data?.message || 'Failed to save');
        } finally { setSaving(false); }
    };

    // Computed totals
    const base         = parseFloat(form.baseSalary) || 0;
    const allowTotal   = Object.values(form.allowances).reduce((s, v) => s + (parseFloat(v) || 0), 0);
    const deductTotal  = Object.values(form.deductions).reduce((s, v) => s + (parseFloat(v) || 0), 0);
    const grossSalary  = base + allowTotal;
    const netSalary    = Math.max(0, grossSalary - deductTotal);

    const cardClass = "bg-[var(--card-bg)] border border-[var(--border-color)] rounded-3xl p-6 shadow-xl hover:border-emerald-500/30 transition-all";
    const inputClass = "w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all";
    const labelClass = "text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1 block";

    if (loading) return (
        <div className="flex items-center justify-center py-10">
            <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        </div>
    );

    return (
        <div className={cardClass}>
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <h2 className="flex items-center gap-2 text-xl font-bold text-[var(--text-primary)]">
                    <IndianRupee className="w-6 h-6 p-1 rounded-lg bg-emerald-500/10 text-emerald-500" />
                    Salary Structure
                </h2>
                {canEdit && !isEditing && (
                    <button onClick={() => setIsEditing(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl text-sm font-semibold text-[var(--text-secondary)] hover:border-emerald-500/50 hover:text-emerald-500 transition-all">
                        <Edit3 className="w-4 h-4" /> {structure ? 'Edit' : 'Set Structure'}
                    </button>
                )}
                {isEditing && (
                    <div className="flex gap-2">
                        <button onClick={() => setIsEditing(false)} className="px-4 py-2 rounded-xl text-sm font-semibold text-[var(--text-secondary)] hover:bg-[var(--hover-bg)] transition-colors">Cancel</button>
                        <button onClick={handleSave} disabled={saving}
                            className="flex items-center gap-2 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-emerald-900/20 disabled:opacity-60">
                            <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save Structure'}
                        </button>
                    </div>
                )}
            </div>

            {/* Live Summary Bar */}
            {(isEditing || structure) && (
                <div className="grid grid-cols-3 gap-4 mb-6 p-4 bg-[var(--bg-secondary)]/50 rounded-2xl border border-[var(--border-color)]">
                    <div className="text-center">
                        <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Gross Salary</p>
                        <p className="text-lg font-extrabold text-blue-500 mt-1">{fmt(grossSalary)}</p>
                    </div>
                    <div className="text-center border-x border-[var(--border-color)]">
                        <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Total Deductions</p>
                        <p className="text-lg font-extrabold text-red-500 mt-1">-{fmt(deductTotal)}</p>
                    </div>
                    <div className="text-center">
                        <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">Est. Net Pay</p>
                        <p className="text-lg font-extrabold text-emerald-500 mt-1">{fmt(netSalary)}</p>
                    </div>
                </div>
            )}

            {/* No structure set yet (view mode) */}
            {!isEditing && !structure && (
                <div className="flex flex-col items-center justify-center py-12 border border-dashed border-[var(--border-color)] rounded-2xl">
                    <IndianRupee className="w-12 h-12 text-slate-400/40 mb-3" />
                    <h3 className="text-base font-bold text-[var(--text-primary)]">No Salary Structure Configured</h3>
                    <p className="text-[var(--text-secondary)] text-sm mt-1 text-center max-w-xs">
                        {canEdit ? 'Click "Set Structure" to define this employee\'s salary components.' : 'HR/Manager has not set up a salary structure yet.'}
                    </p>
                </div>
            )}

            {/* VIEW MODE */}
            {!isEditing && structure && (
                <div className="space-y-5">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                        <div className="p-4 rounded-2xl bg-[var(--bg-secondary)]/30 border border-transparent hover:border-[var(--border-color)] transition-all">
                            <p className={labelClass}>Base Salary</p>
                            <p className="text-base font-bold text-[var(--text-primary)]">{fmt(structure.baseSalary)}</p>
                        </div>
                        <div className="p-4 rounded-2xl bg-[var(--bg-secondary)]/30 border border-transparent hover:border-[var(--border-color)] transition-all">
                            <p className={labelClass}>Pay Type</p>
                            <p className="text-base font-bold text-[var(--text-primary)]">{structure.payType}</p>
                        </div>
                        <div className="p-4 rounded-2xl bg-[var(--bg-secondary)]/30 border border-transparent hover:border-[var(--border-color)] transition-all">
                            <p className={labelClass}>Currency</p>
                            <p className="text-base font-bold text-[var(--text-primary)]">{structure.currency}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {/* Allowances */}
                        <div className="p-4 rounded-2xl border border-[var(--border-color)] bg-emerald-500/5">
                            <p className="text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                <TrendingUp className="w-4 h-4" /> Allowances
                            </p>
                            {Object.entries(structure.allowances || {}).length === 0 ? (
                                <p className="text-sm text-[var(--text-secondary)] italic">None configured</p>
                            ) : Object.entries(structure.allowances).map(([k, v]) => (
                                <div key={k} className="flex justify-between items-center py-1.5 border-b border-emerald-500/10 last:border-0">
                                    <span className="text-sm text-[var(--text-primary)] font-medium">{k}</span>
                                    <span className="text-sm font-bold text-emerald-500">+{fmt(v)}</span>
                                </div>
                            ))}
                            <div className="flex justify-between items-center pt-2 mt-1">
                                <span className="text-xs font-bold text-[var(--text-secondary)] uppercase">Total</span>
                                <span className="text-sm font-extrabold text-emerald-500">{fmt(allowTotal)}</span>
                            </div>
                        </div>

                        {/* Deductions */}
                        <div className="p-4 rounded-2xl border border-[var(--border-color)] bg-red-500/5">
                            <p className="text-xs font-black text-red-500 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                                <TrendingDown className="w-4 h-4" /> Deductions
                            </p>
                            {Object.entries(structure.deductions || {}).length === 0 ? (
                                <p className="text-sm text-[var(--text-secondary)] italic">None configured</p>
                            ) : Object.entries(structure.deductions).map(([k, v]) => (
                                <div key={k} className="flex justify-between items-center py-1.5 border-b border-red-500/10 last:border-0">
                                    <span className="text-sm text-[var(--text-primary)] font-medium">{k}</span>
                                    <span className="text-sm font-bold text-red-500">-{fmt(v)}</span>
                                </div>
                            ))}
                            <div className="flex justify-between items-center pt-2 mt-1">
                                <span className="text-xs font-bold text-[var(--text-secondary)] uppercase">Total</span>
                                <span className="text-sm font-extrabold text-red-500">-{fmt(deductTotal)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* EDIT MODE */}
            {isEditing && (
                <div className="space-y-6">
                    {/* Basic fields */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className={labelClass}>Base Salary (₹) <span className="text-red-500">*</span></label>
                            <input type="number" min="0" placeholder="e.g. 30000" value={form.baseSalary}
                                onChange={e => setForm(f => ({ ...f, baseSalary: e.target.value }))}
                                className={inputClass} />
                        </div>
                        <div>
                            <label className={labelClass}>Pay Type</label>
                            <select value={form.payType} onChange={e => setForm(f => ({ ...f, payType: e.target.value }))} className={inputClass}>
                                {['Monthly', 'Weekly', 'Hourly', 'Task-Based'].map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className={labelClass}>Currency</label>
                            <select value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value }))} className={inputClass}>
                                {['INR', 'USD', 'EUR', 'GBP'].map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                    </div>

                    {/* Allowances */}
                    <div className="rounded-2xl border border-[var(--border-color)] overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-3 bg-emerald-500/5 border-b border-[var(--border-color)]">
                            <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                                <TrendingUp className="w-4 h-4" /> Allowances
                            </span>
                            <button type="button" onClick={() => addEntry('allowances')}
                                className="flex items-center gap-1 px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-colors">
                                <Plus className="w-3 h-3" /> Add
                            </button>
                        </div>
                        <div className="p-4 space-y-3">
                            {Object.entries(form.allowances).length === 0 ? (
                                <p className="text-sm text-[var(--text-secondary)] italic text-center py-4">Click "Add" to include allowances like HRA, Travel, Medical…</p>
                            ) : Object.entries(form.allowances).map(([k, v]) => (
                                <div key={k} className="flex items-center gap-3">
                                    <span className="text-sm font-semibold text-[var(--text-primary)] min-w-[120px]">{k}</span>
                                    <input type="number" min="0" placeholder="Amount" value={v}
                                        onChange={e => setForm(f => ({ ...f, allowances: { ...f.allowances, [k]: e.target.value } }))}
                                        className={`${inputClass} flex-1`} />
                                    <button type="button" onClick={() => removeEntry('allowances', k)}
                                        className="p-2 rounded-xl text-red-500 hover:bg-red-500/10 transition-colors shrink-0">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Deductions */}
                    <div className="rounded-2xl border border-[var(--border-color)] overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-3 bg-red-500/5 border-b border-[var(--border-color)]">
                            <span className="text-xs font-black text-red-500 uppercase tracking-wider flex items-center gap-1.5">
                                <TrendingDown className="w-4 h-4" /> Deductions
                            </span>
                            <button type="button" onClick={() => addEntry('deductions')}
                                className="flex items-center gap-1 px-3 py-1 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold transition-colors">
                                <Plus className="w-3 h-3" /> Add
                            </button>
                        </div>
                        <div className="p-4 space-y-3">
                            {Object.entries(form.deductions).length === 0 ? (
                                <p className="text-sm text-[var(--text-secondary)] italic text-center py-4">Click "Add" to include deductions like PF, ESI, Advance Recovery…</p>
                            ) : Object.entries(form.deductions).map(([k, v]) => (
                                <div key={k} className="flex items-center gap-3">
                                    <span className="text-sm font-semibold text-[var(--text-primary)] min-w-[120px]">{k}</span>
                                    <input type="number" min="0" placeholder="Amount" value={v}
                                        onChange={e => setForm(f => ({ ...f, deductions: { ...f.deductions, [k]: e.target.value } }))}
                                        className={`${inputClass} flex-1`} />
                                    <button type="button" onClick={() => removeEntry('deductions', k)}
                                        className="p-2 rounded-xl text-red-500 hover:bg-red-500/10 transition-colors shrink-0">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <p className="text-[10px] text-[var(--text-secondary)] italic text-center">
                        Note: Statutory deductions (PF, ESI, PT, TDS) are auto-calculated during payroll generation based on these base values.
                    </p>
                </div>
            )}
        </div>
    );
};


// ─── Main Employee Details Page ──────────────────
const EmployeeDetailsPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useSelector((state) => state.auth);
    const [employee, setEmployee] = useState(null);
    const [loading, setLoading] = useState(true);

    const handleForceResetPassword = async () => {
        const password = window.prompt(`Are you sure you want to FORCE reset the password for ${employee.firstName}?\n\nPlease enter your Admin password to confirm:`);
        if (!password) return;

        try {
            const token = localStorage.getItem('token');
            const res = await axios.post(`${API}/employees/${employee.id}/force-password-reset`, { adminPassword: password }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert(`Password reset successfully!\n\nTemporary Password: ${res.data.tempPassword}\n\nPlease copy this and share it with the employee securely.`);
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to force reset password');
        }
    };

    const handleHrAssistReset = async () => {
        if (!window.confirm(`Send an OTP reset email to ${employee.User?.email} on their behalf?`)) return;
        try {
            await axios.post(`${API}/auth/forgot-password`, { email: employee.User.email });
            alert(`OTP sent to ${employee.User.email} successfully.`);
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to send OTP');
        }
    };

    useEffect(() => {
        const fetchEmployeeDetails = async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await axios.get(`${API}/employees/${id}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setEmployee(res.data);
            } catch (err) {
                console.error('Failed to fetch employee details:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchEmployeeDetails();
    }, [id]);

    if (loading) return (
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="mt-4 text-[var(--text-secondary)] font-medium">Loading Employee Profile...</p>
        </div>
    );

    if (!employee) return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
            <ShieldAlert className="w-16 h-16 text-red-500/50" />
            <h2 className="text-xl font-bold text-[var(--text-primary)]">Employee Not Found</h2>
            <button onClick={() => navigate('/employees')}
                className="px-6 py-2 bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-secondary)] rounded-xl hover:bg-[var(--hover-bg)] transition-colors">
                Back to Directory
            </button>
        </div>
    );

    // Design Tokens
    const cardClass      = "bg-[var(--card-bg)] border border-[var(--border-color)] rounded-3xl p-6 shadow-xl shadow-slate-200/5 dark:shadow-none hover:border-blue-500/30 transition-all";
    const sectionHeaderClass = "flex items-center gap-2 text-lg font-bold text-[var(--text-primary)] border-b border-[var(--border-color)] pb-3 mb-5";
    const labelClass     = "text-[10px] sm:text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-1";
    const valueClass     = "text-sm font-medium text-[var(--text-primary)] break-words";
    const iconWrapper    = "p-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] text-blue-500";

    const InfoBlock = ({ label, value, icon: Icon, span = 1 }) => (
        <div className={`col-span-1 md:col-span-${span} flex items-start gap-4 p-4 rounded-2xl bg-[var(--bg-secondary)]/30 border border-transparent hover:border-[var(--border-color)] transition-all`}>
            {Icon && (
                <div className="p-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-secondary)] shadow-sm">
                    <Icon className="w-5 h-5" />
                </div>
            )}
            <div>
                <p className={labelClass}>{label}</p>
                <p className={valueClass}>{value || <span className="text-slate-400 italic">Not Provided</span>}</p>
            </div>
        </div>
    );

    return (
        <div className="font-sans space-y-6 pb-12 animate-in fade-in duration-500 max-w-7xl mx-auto">

            {/* Action Bar */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <button onClick={() => navigate('/employees')}
                    className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-blue-500 font-semibold transition-colors bg-[var(--card-bg)] px-4 py-2 rounded-xl border border-[var(--border-color)]">
                    <ArrowLeft className="w-4 h-4" /> Back to Directory
                </button>
                <div className="flex flex-wrap gap-2">
                    {user?.role === 'Super Admin' && (
                        <button onClick={handleForceResetPassword}
                            className="flex items-center gap-2 bg-rose-600/10 hover:bg-rose-600/20 text-rose-500 border border-rose-500/20 px-4 py-2.5 rounded-xl font-bold transition-all shadow-sm text-sm">
                            <ShieldAlert className="w-4 h-4" /> Reset Credentials
                        </button>
                    )}
                    {user?.role === 'HR' && (
                        <button onClick={handleHrAssistReset}
                            className="flex items-center gap-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 border border-amber-500/20 px-4 py-2.5 rounded-xl font-bold transition-all shadow-sm text-sm">
                            <KeyRound className="w-4 h-4" /> Send OTP Assist
                        </button>
                    )}
                    <button onClick={() => navigate(`/employees/edit/${employee.id}`, { state: { employee } })}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl font-semibold transition-all shadow-lg shadow-blue-900/20 text-sm">
                        Edit Profile
                    </button>
                </div>
            </div>

            {/* Profile Header Card */}
            <div className={`${cardClass} flex flex-col md:flex-row items-center md:items-start gap-8 relative overflow-hidden`}>
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 blur-3xl rounded-full -mr-20 -mt-20 pointer-events-none" />
                <div className="relative shrink-0 z-10">
                    {employee.profilePicture ? (
                        <img src={employee.profilePicture.startsWith('http') ? employee.profilePicture : `/uploads/${employee.profilePicture}`} alt={employee.firstName}
                            className="w-32 h-32 md:w-40 md:h-40 rounded-3xl object-cover border-4 border-[var(--bg-secondary)] shadow-2xl" />
                    ) : (
                        <div className="w-32 h-32 md:w-40 md:h-40 rounded-3xl bg-blue-500/10 flex items-center justify-center text-blue-500 font-bold text-4xl border border-blue-500/20 shadow-2xl">
                            {employee.firstName?.[0]}{employee.lastName?.[0]}
                        </div>
                    )}
                    <div className={`absolute -bottom-3 -right-3 px-3 py-1.5 rounded-lg border-2 border-[var(--card-bg)] text-xs font-bold uppercase shadow-lg ${
                        employee.status === 'Active' ? 'bg-green-500 text-white' :
                        employee.status === 'Inactive' ? 'bg-red-500 text-white' : 'bg-amber-500 text-white'
                    }`}>{employee.status}</div>
                </div>
                <div className="flex-1 flex flex-col justify-center text-center md:text-left z-10 w-full">
                    <h1 className="text-3xl md:text-4xl font-extrabold text-[var(--text-primary)] tracking-tight">
                        {employee.firstName} {employee.lastName}
                    </h1>
                    <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 mt-3 text-[var(--text-secondary)] font-medium">
                        <span className="flex items-center gap-1.5"><Briefcase className="w-4 h-4" /> {employee.designation || 'Unassigned Role'}</span>
                        <span className="hidden sm:inline text-slate-300 dark:text-slate-700">•</span>
                        <span className="flex items-center gap-1.5"><Database className="w-4 h-4" /> ID: {employee.employeeId}</span>
                        <span className="hidden sm:inline text-slate-300 dark:text-slate-700">•</span>
                        <span className="flex items-center gap-1.5 text-blue-500 bg-blue-500/10 px-2 py-0.5 rounded-md"><Activity className="w-4 h-4" /> {employee.Department?.name || 'No Department'}</span>
                    </div>
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mt-6 pt-6 border-t border-[var(--border-color)]">
                        <a href={`mailto:${employee.User?.email}`} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] hover:border-blue-500/50 hover:text-blue-500 transition-colors text-sm text-[var(--text-primary)] font-medium">
                            <Mail className="w-4 h-4 text-[var(--text-secondary)]" /> {employee.User?.email}
                        </a>
                        <a href={`tel:${employee.phone}`} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] hover:border-emerald-500/50 hover:text-emerald-500 transition-colors text-sm text-[var(--text-primary)] font-medium">
                            <Phone className="w-4 h-4 text-[var(--text-secondary)]" /> {employee.phone || 'N/A'}
                        </a>
                    </div>
                </div>
            </div>

            {/* Detail Cards Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className={cardClass}>
                    <h2 className={sectionHeaderClass}><Users className={iconWrapper} /> Personal Information</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <InfoBlock label="Date of Birth" value={employee.dob} icon={Calendar} />
                        <InfoBlock label="Gender" value={employee.gender} />
                        <InfoBlock label="Marital Status" value={employee.maritalStatus} icon={Heart} />
                        <InfoBlock label="Nationality" value={employee.nationality} icon={Flag} />
                        <InfoBlock label="Father's Name" value={employee.fatherName} span={2} />
                        <InfoBlock label="Mother's Name" value={employee.motherName} span={2} />
                    </div>
                </div>
                <div className={cardClass}>
                    <h2 className={sectionHeaderClass}><MapPin className={iconWrapper} /> Contact Details</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <InfoBlock label="WhatsApp Number" value={employee.whatsappNumber} icon={Phone} />
                        <InfoBlock label="LinkedIn Profile" value={employee.linkedinProfile} icon={Briefcase} />
                        <InfoBlock label="Emergency Contact Name" value={employee.emergencyContactName} icon={Users} span={2} />
                        <InfoBlock label="Emergency Contact Phone" value={employee.emergencyContact} icon={ShieldAlert} span={2} />
                        <InfoBlock label="Current Address" value={employee.address} icon={MapPin} span={2} />
                    </div>
                </div>
                <div className={cardClass}>
                    <h2 className={sectionHeaderClass}><DollarSign className={iconWrapper} /> Bank & Identity Details</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <InfoBlock label={`${employee.identityType || 'Identity'} Number`} value={employee.identityNumber} icon={FileText} span={2} />
                        <div className="col-span-1 md:col-span-2 border-t border-[var(--border-color)] mt-2 pt-4"></div>
                        <InfoBlock label="Bank Name" value={employee.bankName} icon={Database} />
                        <InfoBlock label="Account Holder" value={employee.accountHolderName} icon={User} />
                        <InfoBlock label="Account Number" value={employee.bankAccountNumber} icon={CreditCard} span={2} />
                        <InfoBlock label="IFSC Code" value={employee.bankIfscCode} icon={FileText} />
                        <InfoBlock label="UPI ID" value={employee.upiId} />
                    </div>
                </div>
                <div className={cardClass}>
                    <h2 className={sectionHeaderClass}><Briefcase className={iconWrapper} /> Employment Data</h2>
                    <div className="grid grid-cols-1 gap-4">
                        <InfoBlock label="Date of Joining" value={employee.joiningDate} icon={Calendar} />
                        <InfoBlock label="Reporting Manager" value={employee.Manager ? `${employee.Manager.firstName} ${employee.Manager.lastName}` : 'System Standard'} icon={User} />
                        <InfoBlock label="Role Permissions" value={employee.User?.Role?.name || 'N/A'} icon={ShieldAlert} />
                        <InfoBlock label="Training Period" value={employee.trainingPeriodMonths ? `${employee.trainingPeriodMonths} Month(s)` : '0 Months'} icon={Clock} />
                        <InfoBlock label="Probation Period" value={employee.probationPeriodMonths ? `${employee.probationPeriodMonths} Month(s)` : '0 Months'} icon={Clock} />
                        <div className="p-4 rounded-2xl bg-[var(--bg-secondary)]/30 border border-transparent">
                            <p className={labelClass}>System Access Activity</p>
                            <p className="text-sm text-[var(--text-secondary)] flex items-center gap-2 mt-1">
                                <Clock className="w-4 h-4" /> Last Login: {employee.User?.lastLogin ? new Date(employee.User.lastLogin).toLocaleString() : 'Never logged in'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── SALARY STRUCTURE PANEL ── */}
            <SalaryStructurePanel employee={employee} />

            {/* Loan History */}
            <div className={cardClass}>
                <div className="flex items-center mb-6">
                    <h2 className="flex items-center gap-2 text-xl font-bold text-[var(--text-primary)]">
                        <CreditCard className="w-6 h-6 p-1 rounded-lg bg-blue-500/10 text-blue-500" />
                        Loan & Advance History
                    </h2>
                </div>
                {(!employee.Loans || employee.Loans.length === 0) ? (
                    <div className="flex flex-col items-center justify-center py-12 px-4 rounded-2xl bg-[var(--bg-secondary)]/50 border border-dashed border-[var(--border-color)]">
                        <Database className="w-10 h-10 text-slate-400/40 mb-3" />
                        <h3 className="text-base font-bold text-[var(--text-primary)]">No Loans Found</h3>
                        <p className="text-[var(--text-secondary)] text-sm max-w-sm text-center mt-2">
                            This employee has not been issued any financial loans recorded in the system.
                        </p>
                    </div>
                ) : (
                    <div className="overflow-x-auto rounded-xl border border-[var(--border-color)]">
                        <table className="w-full text-left border-collapse min-w-[800px]">
                            <thead>
                                <tr className="bg-[var(--bg-secondary)] text-[var(--text-secondary)] text-xs uppercase tracking-wider">
                                    <th className="px-6 py-4 font-bold">Issue Date</th>
                                    <th className="px-6 py-4 font-bold">Amount</th>
                                    <th className="px-6 py-4 font-bold">Duration</th>
                                    <th className="px-6 py-4 font-bold">Installment</th>
                                    <th className="px-6 py-4 font-bold">Reason</th>
                                    <th className="px-6 py-4 font-bold text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--border-color)]">
                                {employee.Loans.map(loan => (
                                    <tr key={loan.id} className="hover:bg-[var(--bg-secondary)]/50 transition-colors">
                                        <td className="px-6 py-4 text-sm font-medium text-[var(--text-primary)]">{new Date(loan.createdAt).toLocaleDateString()}</td>
                                        <td className="px-6 py-4">
                                            <span className="text-sm font-bold text-[var(--text-primary)]">₹{Number(loan.amount).toLocaleString()}</span>
                                            {loan.remainingAmount > 0 && <p className="text-[10px] text-red-500 font-semibold mt-1">₹{Number(loan.remainingAmount).toLocaleString()} left</p>}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-[var(--text-secondary)]">{loan.repaymentMonths} months</td>
                                        <td className="px-6 py-4 text-sm font-medium text-[var(--text-primary)]">₹{Number(loan.monthlyInstallment).toLocaleString()}/mo</td>
                                        <td className="px-6 py-4 text-sm text-[var(--text-secondary)] max-w-[200px] truncate" title={loan.reason}>{loan.reason}</td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`px-3 py-1 rounded-md text-[10px] font-bold uppercase shadow-sm ${
                                                loan.status === 'Approved' ? 'bg-green-500/10 text-green-500 border border-green-500/20' :
                                                loan.status === 'Rejected' ? 'bg-red-500/10 text-red-500 border border-red-500/20' :
                                                loan.status === 'Completed' ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' :
                                                'bg-amber-500/10 text-amber-500 border border-amber-500/20'
                                            }`}>{loan.status}</span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default EmployeeDetailsPage;
