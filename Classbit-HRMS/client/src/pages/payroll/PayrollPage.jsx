import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { useSelector } from 'react-redux';
import {
    CreditCard, Download, CheckCircle2, AlertCircle, Wand2,
    Search, FileCheck, ShieldCheck, DollarSign, Eye,
    X, TrendingDown, TrendingUp, Users, BarChart3,
    ArrowRight, Building2, ClipboardCheck
} from 'lucide-react';
import Modal from '../../components/Modal';

const API = '/api';

const STATUS_STYLES = {
    Draft:    'bg-amber-500/10 text-amber-500 border border-amber-500/20',
    Verified: 'bg-blue-500/10 text-blue-500 border border-blue-500/20',
    Approved: 'bg-purple-500/10 text-purple-500 border border-purple-500/20',
    Paid:     'bg-green-500/10 text-green-500 border border-green-500/20',
};

const statusDot = { Draft: 'bg-amber-500', Verified: 'bg-blue-500', Approved: 'bg-purple-500', Paid: 'bg-green-500' };

const fmt = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function PayrollPage() {
    const { user } = useSelector((s) => s.auth);
    const role = user?.role;

    const isAdmin    = role === 'Super Admin';
    const isHR       = role === 'HR' || isAdmin;
    const isFinance  = role === 'Finance' || isAdmin;
    const isManager  = role === 'Manager' || isAdmin;
    const canSeeAll  = isHR || isFinance || isManager;

    const [payslips, setPayslips]         = useState([]);
    const [myPayslips, setMyPayslips]     = useState([]);
    const [mySalary, setMySalary]         = useState(null);
    const [activeTab, setActiveTab]       = useState(canSeeAll ? 'organization' : 'my_payslips');
    const [loading, setLoading]           = useState(true);
    const [search, setSearch]             = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [genModal, setGenModal]         = useState(false);
    const [breakdownRec, setBreakdownRec] = useState(null);
    const [genData, setGenData]           = useState({
        month: new Date().getMonth() + 1,
        year:  new Date().getFullYear()
    });
    const [filterMonth, setFilterMonth]   = useState('');
    const [filterYear,  setFilterYear]    = useState(new Date().getFullYear());

    const token   = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };

    const fetchPayslips = async () => {
        setLoading(true);
        try {
            if (canSeeAll) {
                const url = `${API}/payroll/all?${filterMonth ? `month=${filterMonth}&` : ''}year=${filterYear}${filterStatus ? `&status=${filterStatus}` : ''}`;
                const res = await axios.get(url, { headers });
                setPayslips(Array.isArray(res.data) ? res.data : []);
            }
            // Fetch personal data for both employees and admins alike
            const [salRes, payRes] = await Promise.all([
                axios.get(`${API}/salary/my`, { headers }).catch(() => ({ data: null })),
                axios.get(`${API}/payroll/my`, { headers }).catch(() => ({ data: [] }))
            ]);
            setMySalary(salRes.data);
            setMyPayslips(Array.isArray(payRes.data) ? payRes.data : []);
            
            if (!canSeeAll) {
                setPayslips(Array.isArray(payRes.data) ? payRes.data : []); // keep payslips alias for backwards compat
            }
        } catch (e) {
            console.error(e);
        } finally { setLoading(false); }
    };

    useEffect(() => { fetchPayslips(); }, [filterMonth, filterYear, filterStatus]);

    const handleGenerate = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await axios.post(`${API}/payroll/generate`, genData, { headers });
            setGenModal(false);
            fetchPayslips();
        } catch (err) {
            alert(err.response?.data?.message || 'Generation failed');
        } finally { setLoading(false); }
    };

    const handleStatusAction = async (id, action) => {
        try {
            await axios.patch(`${API}/payroll/${id}/status`, { action }, { headers });
            fetchPayslips();
        } catch (err) {
            alert(err.response?.data?.message || 'Action failed');
        }
    };

    const handleBankExport = () => {
        const month = filterMonth || (new Date().getMonth() + 1);
        const year  = filterYear;
        window.open(`${API}/payroll/export/bank?month=${month}&year=${year}&token=${token}`, '_blank');
    };

    const handlePayslipDownload = (rec) => {
        const emp  = rec.Employee;
        const name = emp ? `${emp.firstName} ${emp.lastName}` : 'Employee';
        // Fix MySQL JSON stringification
        const bd   = typeof rec.breakdown === 'string' ? JSON.parse(rec.breakdown) : (rec.breakdown || {});
        let dAllowances = bd.allowances || {};
        let dDeductions = bd.deductions || {};
        if (typeof dAllowances === 'string') dAllowances = JSON.parse(dAllowances);
        if (typeof dDeductions === 'string') dDeductions = JSON.parse(dDeductions);
        
        const mon  = MONTHS[(rec.month || 1) - 1];

        const html = `
<!DOCTYPE html><html><head><title>Payslip – ${name}</title>
<style>
  @media print { * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; } }
  body{font-family:Arial,sans-serif;margin:0;padding:0;color:#1e293b;background:#f8fafc}
  .wrap{max-width:720px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px #0001}
  .header{background:linear-gradient(135deg,#1d4ed8,#4f46e5);color:#fff;padding:32px 40px}
  .header h1{margin:0;font-size:24px}
  .header p{margin:4px 0 0;opacity:.8;font-size:13px}
  .section{padding:24px 40px;border-bottom:1px solid #e2e8f0}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}
  .label{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#64748b}
  .value{font-size:14px;font-weight:600;color:#1e293b;margin-top:2px}
  table{width:100%;border-collapse:collapse;margin-top:8px}
  th{font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#64748b;text-align:left;padding:8px 0;border-bottom:2px solid #e2e8f0}
  td{font-size:13px;color:#334155;padding:10px 0;border-bottom:1px solid #f1f5f9}
  .credit{color:#16a34a;font-weight:700}
  .debit{color:#dc2626;font-weight:700}
  .total{font-weight:800;font-size:15px;background:#f0fdf4;padding:12px 16px;border-radius:8px;display:flex;justify-content:space-between;margin-top:16px}
  .badge{display:inline-block;padding:4px 12px;border-radius:999px;font-size:11px;font-weight:700;background:#dcfce7;color:#15803d}
  .footer{padding:16px 40px;font-size:11px;color:#94a3b8;text-align:center}
</style>
</head><body>
<div class="wrap">
  <div class="header">
    <h1>Salary Payslip</h1>
    <p>${mon} ${rec.year} &nbsp;·&nbsp; Generated ${new Date().toLocaleDateString('en-IN')}</p>
  </div>
  <div class="section">
    <div class="grid">
      <div><p class="label">Employee Name</p><p class="value">${name}</p></div>
      <div><p class="label">Employee ID</p><p class="value">${emp?.employeeId || '—'}</p></div>
      <div><p class="label">Designation</p><p class="value">${emp?.designation || '—'}</p></div>
      <div><p class="label">Bank Account</p><p class="value">${emp?.bankAccountNumber || '—'}</p></div>
      <div><p class="label">IFSC Code</p><p class="value">${emp?.bankIfscCode || '—'}</p></div>
      <div><p class="label">PAN / Identity</p><p class="value">${emp?.identityType || '—'}: ${emp?.identityNumber || '—'}</p></div>
    </div>
  </div>
  <div class="section">
    <div class="grid">
      <div>
        <table>
          <thead><tr><th>Earnings</th><th style="text-align:right">Amount</th></tr></thead>
          <tbody>
            <tr><td>Basic Salary</td><td class="credit" style="text-align:right">₹${Number(bd.effectiveBase||bd.baseSalary||0).toLocaleString('en-IN')}</td></tr>
            ${Object.entries(dAllowances).map(([k,v])=>`<tr><td>${k}</td><td class="credit" style="text-align:right">₹${Number(v).toLocaleString('en-IN')}</td></tr>`).join('')}
          </tbody>
        </table>
      </div>
      <div>
        <table>
          <thead><tr><th>Deductions</th><th style="text-align:right">Amount</th></tr></thead>
          <tbody>
            ${bd.lopAmount > 0 ? `<tr><td>Loss of Pay (${bd.lopDays} days)</td><td class="debit" style="text-align:right">₹${Number(bd.lopAmount).toLocaleString('en-IN')}</td></tr>` : ''}
            ${Object.entries(dDeductions).filter(([,v])=>parseFloat(v)>0).map(([k,v])=>`<tr><td>${k.replace(/([A-Z])/g,' $1').trim()}</td><td class="debit" style="text-align:right">₹${Number(v).toLocaleString('en-IN')}</td></tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>
    <div class="total"><span>NET SALARY <span class="badge">${rec.status}</span></span><span style="color:#1d4ed8">₹${Number(rec.netSalary||0).toLocaleString('en-IN')}</span></div>
  </div>
  <div class="footer">This is a system-generated payslip. For queries contact HR.</div>
</div>
</body></html>`;

        const win = window.open('', '_blank');
        win.document.write(html);
        win.document.close();
        win.print();
    };

    const baseSource = activeTab === 'my_payslips' ? myPayslips : payslips;
    const filtered = baseSource.filter(r => {
        const name = `${r.Employee?.firstName || ''} ${r.Employee?.lastName || ''}`.toLowerCase();
        const eid  = (r.Employee?.employeeId || '').toLowerCase();
        return !search || name.includes(search.toLowerCase()) || eid.includes(search.toLowerCase());
    });

    const totalGross     = filtered.reduce((s, r) => s + parseFloat(r.grossSalary || 0), 0);
    const totalDed       = filtered.reduce((s, r) => s + parseFloat(r.totalDeductions || 0), 0);
    const totalNet       = filtered.reduce((s, r) => s + parseFloat(r.netSalary || 0), 0);
    const paidCount      = filtered.filter(r => r.status === 'Paid').length;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Page Header */}
            <div className="flex flex-col flex-wrap sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text-primary)]">Payroll & Compliance</h1>
                    <p className="text-[var(--text-secondary)] mt-1 text-sm">
                        {canSeeAll ? 'Manage payroll generation, approvals, and disbursements.' : 'View and download your monthly salary statements.'}
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    {isHR && (
                        <button onClick={() => setGenModal(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-xl font-bold text-sm transition-all shadow-lg shadow-blue-900/20">
                            <Wand2 className="w-4 h-4" /> Generate Payroll
                        </button>
                    )}
                    {(isManager || isFinance) && (
                        <button onClick={handleBankExport} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2.5 rounded-xl font-bold text-sm transition-all shadow-lg shadow-emerald-900/20">
                            <Download className="w-4 h-4" /> Export Bank File
                        </button>
                    )}
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex border-b border-[var(--border-color)] overflow-x-auto custom-scrollbar">
                {canSeeAll && (
                    <button onClick={() => setActiveTab('organization')} className={`px-6 py-4 text-sm font-semibold transition-all whitespace-nowrap ${activeTab === 'organization' ? 'text-blue-500 border-b-2 border-blue-500 bg-blue-500/5' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--hover-bg)]'}`}>
                        Organization Payroll
                    </button>
                )}
                <button onClick={() => setActiveTab('my_payslips')} className={`px-6 py-4 text-sm font-semibold transition-all whitespace-nowrap ${activeTab === 'my_payslips' ? 'text-blue-500 border-b-2 border-blue-500 bg-blue-500/5' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--hover-bg)]'}`}>
                    My Payslips
                </button>
                <button onClick={() => setActiveTab('my_salary')} className={`px-6 py-4 text-sm font-semibold transition-all whitespace-nowrap ${activeTab === 'my_salary' ? 'text-blue-500 border-b-2 border-blue-500 bg-blue-500/5' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--hover-bg)]'}`}>
                    My Salary Structure
                </button>
            </div>

            {/* Content Switcher */}
            {activeTab !== 'my_salary' ? (
                <>
                    {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                    { label: 'Total Gross', value: fmt(totalGross), icon: TrendingUp, color: 'text-blue-500', bg: 'bg-blue-500/10' },
                    { label: 'Total Deductions', value: fmt(totalDed), icon: TrendingDown, color: 'text-red-500', bg: 'bg-red-500/10' },
                    { label: 'Net Disbursement', value: fmt(totalNet), icon: DollarSign, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
                    { label: 'Paid Employees', value: `${paidCount} / ${filtered.length}`, icon: Users, color: 'text-purple-500', bg: 'bg-purple-500/10' },
                ].map(card => (
                    <div key={card.label} className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-2xl p-5 shadow-lg hover:border-blue-500/20 transition-all">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider">{card.label}</p>
                                <p className={`text-lg font-bold mt-1 ${card.color}`}>{card.value}</p>
                            </div>
                            <div className={`${card.bg} p-2.5 rounded-xl`}>
                                <card.icon className={`w-5 h-5 ${card.color}`} />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Approval Stage Legend */}
            {activeTab === 'organization' && (
                <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
                    <span className="text-[var(--text-secondary)] uppercase tracking-wider">Workflow:</span>
                    {['Draft','Verified','Approved','Paid'].map((s, i, arr) => (
                        <React.Fragment key={s}>
                            <span className={`px-3 py-1 rounded-full ${STATUS_STYLES[s]}`}>{s}</span>
                            {i < arr.length - 1 && <ArrowRight className="w-3 h-3 text-[var(--text-secondary)]" />}
                        </React.Fragment>
                    ))}
                </div>
            )}

            {/* Filters */}
            {activeTab === 'organization' && (
                <div className="flex flex-wrap gap-3 bg-[var(--card-bg)] border border-[var(--border-color)] p-4 rounded-2xl">
                    <div className="relative flex-1 min-w-[160px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[var(--text-secondary)]" />
                        <input type="text" placeholder="Search employee..." value={search} onChange={e => setSearch(e.target.value)}
                            className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl py-2 pl-8 pr-3 text-xs text-[var(--text-primary)] focus:ring-1 focus:ring-blue-500 focus:outline-none" />
                    </div>
                    <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)}
                        className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-blue-500">
                        <option value="">All Months</option>
                        {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                    </select>
                    <select value={filterYear} onChange={e => setFilterYear(e.target.value)}
                        className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-blue-500">
                        {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                    <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                        className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:ring-1 focus:ring-blue-500">
                        <option value="">All Statuses</option>
                        {['Draft','Verified','Approved','Paid'].map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                </div>
            )}

            {/* Records Table */}
            <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-3xl overflow-hidden shadow-xl">
                <div className="p-4 border-b border-[var(--border-color)] bg-[var(--bg-secondary)]/30 px-6 flex items-center justify-between">
                    <h3 className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-widest flex items-center gap-2">
                        <BarChart3 className="w-4 h-4 text-blue-500" /> Payroll Records
                    </h3>
                    <span className="text-[10px] text-[var(--text-secondary)] font-bold">{filtered.length} records</span>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse min-w-[900px]">
                        <thead>
                            <tr className="bg-[var(--bg-secondary)]/30 text-[var(--text-secondary)] text-[10px] uppercase tracking-widest">
                                <th className="px-6 py-4">{activeTab === 'organization' ? 'Employee' : 'Period'}</th>
                                <th className="px-6 py-4">Gross</th>
                                <th className="px-6 py-4">Deductions</th>
                                <th className="px-6 py-4">Net Pay</th>
                                <th className="px-6 py-4">Status</th>
                                {activeTab === 'organization' && <th className="px-6 py-4">Actions</th>}
                                <th className="px-6 py-4 text-right">Download</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border-color)]">
                            {loading ? (
                                <tr><td colSpan="7" className="px-6 py-14 text-center text-slate-500 italic">Loading records...</td></tr>
                            ) : filtered.length === 0 ? (
                                <tr><td colSpan="7" className="px-6 py-14 text-center text-slate-500 italic">
                                    <ClipboardCheck className="w-10 h-10 mx-auto mb-3 opacity-20" />
                                    No payroll records found.
                                </td></tr>
                            ) : filtered.map(rec => (
                                <tr key={rec.id} className="hover:bg-[var(--hover-bg)] transition-colors">
                                    <td className="px-6 py-4">
                                        {activeTab === 'organization' ? (
                                            <div>
                                                <Link to={`/employees/${rec.Employee?.id}`} className="text-sm font-bold text-[var(--text-primary)] hover:text-blue-500 hover:underline transition-colors w-fit block">
                                                    {rec.Employee?.firstName} {rec.Employee?.lastName}
                                                </Link>
                                                <p className="text-[10px] text-[var(--text-secondary)]">{rec.Employee?.employeeId} · {MONTHS[(rec.month || 1) - 1]} {rec.year}</p>
                                            </div>
                                        ) : (
                                            <p className="text-sm font-bold text-[var(--text-primary)]">{MONTHS[(rec.month || 1) - 1]} {rec.year}</p>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-[var(--text-primary)] font-medium">{fmt(rec.grossSalary)}</td>
                                    <td className="px-6 py-4 text-sm text-red-500 font-medium">-{fmt(rec.totalDeductions)}</td>
                                    <td className="px-6 py-4 text-sm font-bold text-emerald-500">{fmt(rec.netSalary)}</td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold ${STATUS_STYLES[rec.status] || ''}`}>
                                            <div className={`w-1.5 h-1.5 rounded-full ${statusDot[rec.status] || 'bg-slate-500'}`} />
                                            {rec.status}
                                        </span>
                                    </td>
                                    {activeTab === 'organization' && (
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2">
                                                {/* View Breakdown */}
                                                <button onClick={() => setBreakdownRec(rec)} title="View Breakdown"
                                                    className="p-1.5 rounded-lg bg-[var(--bg-secondary)] hover:bg-blue-500/10 text-[var(--text-secondary)] hover:text-blue-500 border border-[var(--border-color)] transition-colors">
                                                    <Eye className="w-3.5 h-3.5" />
                                                </button>
                                                {/* Finance can Verify */}
                                                {isFinance && rec.status === 'Draft' && (
                                                    <button onClick={() => handleStatusAction(rec.id, 'verify')} title="Verify"
                                                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-500 border border-blue-500/20 hover:bg-blue-500/20 text-[10px] font-bold transition-colors">
                                                        <FileCheck className="w-3.5 h-3.5" /> Verify
                                                    </button>
                                                )}
                                                {/* Manager can Approve */}
                                                {isManager && rec.status === 'Verified' && (
                                                    <button onClick={() => handleStatusAction(rec.id, 'approve')} title="Approve"
                                                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-purple-500/10 text-purple-500 border border-purple-500/20 hover:bg-purple-500/20 text-[10px] font-bold transition-colors">
                                                        <ShieldCheck className="w-3.5 h-3.5" /> Approve
                                                    </button>
                                                )}
                                                {/* Manager/Admin can Mark Paid */}
                                                {isManager && rec.status === 'Approved' && (
                                                    <button onClick={() => handleStatusAction(rec.id, 'pay')} title="Mark as Paid"
                                                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500/20 text-[10px] font-bold transition-colors">
                                                        <CheckCircle2 className="w-3.5 h-3.5" /> Mark Paid
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    )}
                                    <td className="px-6 py-4 text-right">
                                        <button onClick={() => handlePayslipDownload(rec)} title="Download Payslip"
                                            className="p-1.5 rounded-lg bg-[var(--bg-secondary)] hover:bg-emerald-500/10 text-[var(--text-secondary)] hover:text-emerald-500 border border-[var(--border-color)] transition-colors">
                                            <Download className="w-3.5 h-3.5" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            </>
            ) : (() => {
                const parseJSON = (v) => {
                    if (!v) return {};
                    if (typeof v === 'object') return v;
                    try { return JSON.parse(v); } catch { return {}; }
                };
                const allowances = parseJSON(mySalary?.allowances);
                const deductions = parseJSON(mySalary?.deductions);
                const allowTotal = Object.values(allowances).reduce((s, v) => s + (parseFloat(v) || 0), 0);
                const deductTotal = Object.values(deductions).reduce((s, v) => s + (parseFloat(v) || 0), 0);
                const grossSalary = (parseFloat(mySalary?.baseSalary) || 0) + allowTotal;
                const netSalary = Math.max(0, grossSalary - deductTotal);

                return (
                    <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-3xl p-6 md:p-10 shadow-xl w-full mx-auto">
                        {!mySalary ? (
                            <div className="flex flex-col items-center justify-center h-64 text-center">
                                <DollarSign className="w-16 h-16 text-slate-400/30 mb-4" />
                                <p className="text-lg font-bold text-[var(--text-primary)]">No Salary Structure Set</p>
                                <p className="text-sm text-[var(--text-secondary)] mt-1">HR has not configured your compensation details yet.</p>
                            </div>
                        ) : (
                            <div className="space-y-6 max-w-5xl mx-auto">
                                <h3 className="text-lg font-bold text-[var(--text-primary)] border-b border-[var(--border-color)] pb-3">My Compensation Structure</h3>
                                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                    <div className="col-span-2 md:col-span-5 p-6 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl text-white shadow-lg mx-auto w-full text-center">
                                        <p className="text-xs font-bold uppercase tracking-wider opacity-75">Configured Gross Salary</p>
                                        <p className="text-4xl font-extrabold mt-2">{fmt(grossSalary)}</p>
                                        <p className="text-xs opacity-80 mt-2">{mySalary.payType} · {mySalary.currency}</p>
                                    </div>
                                    <div className="col-span-1 p-5 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-center">
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Base Pay</p>
                                        <p className="text-lg font-extrabold text-emerald-500 mt-1">{fmt(mySalary.baseSalary)}</p>
                                    </div>
                                    <div className="col-span-1 p-5 bg-green-500/10 border border-green-500/20 rounded-2xl text-center">
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-green-600 dark:text-green-400">Allowances</p>
                                        <p className="text-lg font-extrabold text-green-500 mt-1">+{fmt(allowTotal)}</p>
                                    </div>
                                    <div className="col-span-1 md:col-span-2 p-5 bg-red-500/10 border border-red-500/20 rounded-2xl text-center">
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-red-500">Deductions</p>
                                        <p className="text-lg font-extrabold text-red-500 mt-1">-{fmt(deductTotal)}</p>
                                    </div>
                                    <div className="col-span-2 md:col-span-1 p-5 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl text-center">
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">Est. Net Pay</p>
                                        <p className="text-lg font-extrabold text-[var(--text-primary)] mt-1">{fmt(netSalary)}</p>
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
                                    {Object.keys(allowances).length > 0 && (
                                        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5">
                                            <div className="px-5 py-4 border-b border-emerald-500/20 flex items-center gap-2">
                                                <TrendingUp className="w-5 h-5 text-emerald-500" />
                                                <p className="text-sm font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Allowances</p>
                                            </div>
                                            <div className="p-5 space-y-3">
                                                {Object.entries(allowances).map(([k, v]) => (
                                                    <div key={k} className="flex justify-between items-center bg-[var(--bg-secondary)] px-4 py-2.5 rounded-xl border border-[var(--border-color)]">
                                                        <span className="text-sm font-semibold text-[var(--text-primary)]">{k}</span>
                                                        <span className="font-bold text-emerald-500">+{fmt(v)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {Object.keys(deductions).length > 0 && (
                                        <div className="rounded-2xl border border-red-500/20 bg-red-500/5">
                                            <div className="px-5 py-4 border-b border-red-500/20 flex items-center gap-2">
                                                <TrendingDown className="w-5 h-5 text-red-500" />
                                                <p className="text-sm font-black text-red-500 uppercase tracking-wider">Deductions</p>
                                            </div>
                                            <div className="p-5 space-y-3">
                                                {Object.entries(deductions).map(([k, v]) => (
                                                    <div key={k} className="flex justify-between items-center bg-[var(--bg-secondary)] px-4 py-2.5 rounded-xl border border-[var(--border-color)]">
                                                        <span className="text-sm font-semibold text-[var(--text-primary)]">{k}</span>
                                                        <span className="font-bold text-red-500">-{fmt(v)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                );
            })()}

            {/* Generate Modal */}
            <Modal isOpen={genModal} onClose={() => setGenModal(false)} title="Generate Monthly Payroll Draft">
                <form onSubmit={handleGenerate} className="space-y-5">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider block mb-2">Target Month</label>
                            <select value={genData.month} onChange={e => setGenData({ ...genData, month: +e.target.value })}
                                className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500/30">
                                {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-wider block mb-2">Fiscal Year</label>
                            <select value={genData.year} onChange={e => setGenData({ ...genData, year: +e.target.value })}
                                className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-sm text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-blue-500/30">
                                {[2024, 2025, 2026, 2027].map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl flex gap-3 text-left">
                        <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                        <div className="text-xs text-[var(--text-secondary)] leading-relaxed space-y-1">
                            <p className="font-bold text-[var(--text-primary)]">This will automatically:</p>
                            <p>• Calculate <strong>LOP</strong> based on attendance records</p>
                            <p>• Deduct <strong>PF, ESI, Professional Tax &amp; TDS</strong> as per Indian compliance</p>
                            <p>• Recover active <strong>Loan installments</strong> from net pay</p>
                            <p>• Set initial status to <strong>Draft</strong> (pending Finance verification)</p>
                        </div>
                    </div>
                    <div className="flex justify-end gap-3 pt-2">
                        <button type="button" onClick={() => setGenModal(false)} className="px-5 py-2.5 text-sm font-bold text-[var(--text-secondary)] hover:bg-[var(--hover-bg)] rounded-xl transition-colors">Cancel</button>
                        <button type="submit" className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-xl font-bold shadow-lg shadow-blue-900/20 transition-all text-sm">
                            Run Payroll Engine
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Breakdown Modal */}
            <Modal isOpen={!!breakdownRec} onClose={() => setBreakdownRec(null)} title={`Payslip Breakdown — ${breakdownRec?.Employee?.firstName} ${breakdownRec?.Employee?.lastName}`}>
                {breakdownRec && (() => {
                    // Fix MySQL JSON stringification
                    const bd  = typeof breakdownRec.breakdown === 'string' ? JSON.parse(breakdownRec.breakdown) : (breakdownRec.breakdown || {});
                    let parsedAllowances = bd.allowances || {};
                    let parsedDeductions = bd.deductions || {};
                    if (typeof parsedAllowances === 'string') parsedAllowances = JSON.parse(parsedAllowances);
                    if (typeof parsedDeductions === 'string') parsedDeductions = JSON.parse(parsedDeductions);
                    
                    const ded = parsedDeductions;
                    return (
                        <div className="space-y-6">
                            {/* Premium Header: Employee Profile & Status */}
                            <div className="bg-gradient-to-r from-blue-600/10 to-indigo-600/5 border border-blue-500/20 p-5 rounded-3xl flex items-center justify-between shadow-inner">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 bg-blue-600/20 rounded-2xl flex items-center justify-center border border-blue-500/30">
                                        <span className="text-xl font-black text-blue-500">
                                            {breakdownRec.Employee?.firstName?.charAt(0)}{breakdownRec.Employee?.lastName?.charAt(0)}
                                        </span>
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-bold text-[var(--text-primary)]">
                                            {breakdownRec.Employee?.firstName} {breakdownRec.Employee?.lastName}
                                        </h3>
                                        <p className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest mt-0.5">
                                            {MONTHS[(breakdownRec.month || 1) - 1]} {breakdownRec.year} · {breakdownRec.Employee?.employeeId}
                                        </p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold tracking-widest shadow-lg ${STATUS_STYLES[breakdownRec.status]}`}>
                                        <div className={`w-2 h-2 rounded-full ${statusDot[breakdownRec.status]} animate-pulse`} />
                                        {breakdownRec.status}
                                    </span>
                                </div>
                            </div>

                            {/* Main Breakdown Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Earnings Panel */}
                                <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-3xl p-6 shadow-md hover:shadow-xl transition-shadow">
                                    <div className="flex items-center gap-2 mb-6 pb-4 border-b border-[var(--border-color)]">
                                        <TrendingUp className="w-5 h-5 text-emerald-500" />
                                        <h4 className="text-sm font-black uppercase tracking-widest text-[var(--text-primary)]">Earnings</h4>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="flex justify-between items-center group">
                                            <span className="text-sm text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">Base Salary</span>
                                            <span className="font-bold text-[var(--text-primary)]">{fmt(bd.baseSalary)}</span>
                                        </div>
                                        {bd.lopDays > 0 && (
                                            <div className="flex justify-between items-center group bg-red-500/5 -mx-3 px-3 py-2 rounded-xl border border-red-500/10">
                                                <span className="text-sm font-bold text-red-500 flex items-center gap-1.5">
                                                    <AlertCircle className="w-4 h-4" /> Loss of Pay ({bd.lopDays} days)
                                                </span>
                                                <span className="font-bold text-red-500">-{fmt(bd.lopAmount)}</span>
                                            </div>
                                        )}
                                        {Object.entries(parsedAllowances).map(([k, v]) => (
                                            <div key={k} className="flex justify-between items-center group">
                                                <span className="text-sm text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">{k}</span>
                                                <span className="font-bold text-emerald-500">+{fmt(v)}</span>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="mt-6 pt-4 border-t border-[var(--border-color)] flex justify-between items-center">
                                        <span className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Gross Total</span>
                                        <span className="text-lg font-black text-blue-500">{fmt(breakdownRec.grossSalary)}</span>
                                    </div>
                                </div>

                                {/* Deductions Panel */}
                                <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-3xl p-6 shadow-md hover:shadow-xl transition-shadow relative overflow-hidden">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full -mr-16 -mt-16 blur-3xl" />
                                    <div className="flex items-center gap-2 mb-6 pb-4 border-b border-[var(--border-color)] relative z-10">
                                        <TrendingDown className="w-5 h-5 text-red-500" />
                                        <h4 className="text-sm font-black uppercase tracking-widest text-[var(--text-primary)]">Deductions</h4>
                                    </div>
                                    <div className="space-y-4 relative z-10">
                                        {Object.entries(ded).filter(([, v]) => parseFloat(v) > 0).length === 0 ? (
                                            <p className="text-sm text-[var(--text-secondary)] italic text-center py-4">No statutory deductions applied.</p>
                                        ) : (
                                            Object.entries(ded).filter(([, v]) => parseFloat(v) > 0).map(([k, v]) => (
                                                <div key={k} className="flex justify-between items-center group">
                                                    <span className="text-sm text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors">
                                                        {k.replace(/([A-Z])/g, ' $1').trim().replace(/^./, str => str.toUpperCase())}
                                                    </span>
                                                    <span className="font-bold text-red-500">-{fmt(v)}</span>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                    <div className="mt-6 pt-4 border-t border-[var(--border-color)] flex justify-between items-center relative z-10">
                                        <span className="text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Deductions Total</span>
                                        <span className="text-lg font-black text-red-500">-{fmt(breakdownRec.totalDeductions)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Premium Net Salary Block */}
                            <div className="relative overflow-hidden bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-green-500/10 border border-emerald-500/30 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row justify-between items-center shadow-2xl">
                                <div className="absolute top-0 right-10 w-64 h-64 bg-emerald-500/20 rounded-full blur-3xl opacity-50" />
                                <div className="relative z-10 text-center md:text-left mb-4 md:mb-0">
                                    <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-600/80 mb-2">Net Disbursable Salary</p>
                                    <p className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-600 drop-shadow-sm">
                                        {fmt(breakdownRec.netSalary)}
                                    </p>
                                </div>
                                <div className="relative z-10">
                                    <button onClick={() => { setBreakdownRec(null); handlePayslipDownload(breakdownRec); }}
                                        className="flex items-center gap-3 bg-emerald-600 hover:bg-emerald-500 hover:scale-105 text-white px-8 py-4 rounded-2xl text-sm font-bold transition-all shadow-xl shadow-emerald-900/30">
                                        <Download className="w-5 h-5 animate-bounce" /> Print / Download
                                    </button>
                                </div>
                            </div>

                            {/* Statutory Subtext */}
                            {ded.pfEmployer > 0 && (
                                <div className="text-center pt-2">
                                    <span className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-full text-[10px] font-bold text-[var(--text-secondary)] uppercase tracking-widest">
                                        <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
                                        Employer PF Match (₹{Number(ded.pfEmployer).toLocaleString('en-IN')}) contributed separately.
                                    </span>
                                </div>
                            )}
                        </div>
                    );
                })()}
            </Modal>
        </div>
    );
}
