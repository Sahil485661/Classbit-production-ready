import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Mail, Settings2, Activity, Save, AlertCircle, Copy, CheckCircle2, History } from 'lucide-react';

const API = '/api';

const EmailSettingsView = () => {
    const [activeTab, setActiveTab] = useState('templates'); // 'templates' or 'logs'
    const [templates, setTemplates] = useState([]);
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [formData, setFormData] = useState({ subject: '', htmlBody: '' });
    const [saveSuccess, setSaveSuccess] = useState(false);

    useEffect(() => {
        fetchTemplates();
        fetchLogs();
    }, []);

    const fetchTemplates = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API}/email-settings/templates`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setTemplates(res.data);
            if (res.data.length > 0 && !selectedTemplate) {
                handleSelectTemplate(res.data[0]);
            }
            setLoading(false);
        } catch (error) {
            console.error('Failed to fetch templates', error);
            setLoading(false);
        }
    };

    const fetchLogs = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API}/email-settings/logs`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setLogs(res.data);
        } catch (error) {
            console.error('Failed to fetch logs', error);
        }
    };

    const handleSelectTemplate = (t) => {
        setSelectedTemplate(t);
        setFormData({ subject: t.subject, htmlBody: t.htmlBody });
        setSaveSuccess(false);
    };

    const handleUpdateTemplate = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            await axios.put(`${API}/email-settings/templates/${selectedTemplate.id}`, formData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 3000);
            fetchTemplates();
        } catch (error) {
            console.error('Failed to update template', error);
            alert('Failed to save template. Please try again.');
        }
    };

    const insertVariable = (variable) => {
        setFormData(prev => ({
            ...prev,
            htmlBody: prev.htmlBody + ` {${variable}} `
        }));
    };

    const commonVariables = [
        'company_name', 'portal_url', 'employee_name', 'hr_contact', 'otp',
        'amount', 'installments', 'start_date', 'end_date', 'reason', 'category',
        'meeting_title', 'meeting_time', 'meeting_link', 'agenda'
    ];

    if (loading) {
        return <div className="p-8 text-center text-[var(--text-secondary)]">Loading Email Configuration...</div>;
    }

    return (
        <div className="space-y-6">
            {/* Header / Tabs */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-[var(--text-primary)]">Email Settings</h2>
                    <p className="text-[var(--text-secondary)]">Manage automated email templates and monitor outgoing communications.</p>
                </div>
                <div className="flex bg-[var(--bg-secondary)] p-1 rounded-xl shadow-inner border border-[var(--border-color)]">
                    <button 
                        onClick={() => setActiveTab('templates')}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${
                            activeTab === 'templates' 
                            ? 'bg-blue-600 text-white shadow-md' 
                            : 'text-[var(--text-secondary)] hover:text-blue-500 hover:bg-[var(--hover-bg)]'
                        }`}
                    >
                        <Settings2 className="w-4 h-4" /> Templates
                    </button>
                    <button 
                        onClick={() => setActiveTab('logs')}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-bold transition-all ${
                            activeTab === 'logs' 
                            ? 'bg-blue-600 text-white shadow-md' 
                            : 'text-[var(--text-secondary)] hover:text-blue-500 hover:bg-[var(--hover-bg)]'
                        }`}
                    >
                        <History className="w-4 h-4" /> Audit Logs
                    </button>
                </div>
            </div>

            {activeTab === 'templates' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-300">
                    {/* Left Sidebar - Template List */}
                    <div className="lg:col-span-4 space-y-3">
                        <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] p-4 rounded-2xl flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-500">
                                <Mail className="w-5 h-5" />
                            </div>
                            <div>
                                <h3 className="font-bold text-[var(--text-primary)]">System Templates</h3>
                                <p className="text-xs text-[var(--text-secondary)]">Available dynamic templates</p>
                            </div>
                        </div>

                        <div className="flex flex-col gap-2 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                            {templates.map(t => (
                                <button 
                                    key={t.id}
                                    onClick={() => handleSelectTemplate(t)}
                                    className={`text-left p-4 rounded-xl border transition-all ${
                                        selectedTemplate?.id === t.id
                                            ? 'bg-blue-500/10 border-blue-500/30'
                                            : 'bg-[var(--bg-secondary)] border-[var(--border-color)] hover:border-blue-500/50'
                                    }`}
                                >
                                    <div className="flex justify-between items-start mb-1">
                                        <span className={`font-bold text-sm ${selectedTemplate?.id === t.id ? 'text-blue-500' : 'text-[var(--text-primary)]'}`}>
                                            {t.name}
                                        </span>
                                    </div>
                                    <p className="text-xs text-[var(--text-secondary)] line-clamp-2">{t.description}</p>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Right Area - Editor */}
                    <div className="lg:col-span-8">
                        {selectedTemplate ? (
                            <form onSubmit={handleUpdateTemplate} className="space-y-4">
                                <div className="space-y-4">
                                    {/* Subject */}
                                    <div>
                                        <label className="block text-sm font-bold text-[var(--text-secondary)] mb-2 uppercase tracking-wide">
                                            Email Subject
                                        </label>
                                        <input 
                                            type="text"
                                            value={formData.subject}
                                            onChange={(e) => setFormData({...formData, subject: e.target.value})}
                                            className="w-full bg-[var(--bg-secondary)] text-[var(--text-primary)] border border-[var(--border-color)] rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-medium"
                                            required
                                        />
                                    </div>

                                    {/* Quick Variables */}
                                    <div>
                                        <label className="block text-xs font-bold text-[var(--text-secondary)] mb-2 uppercase tracking-wide">
                                            Available Variables (Click to insert)
                                        </label>
                                        <div className="flex flex-wrap gap-2">
                                            {commonVariables.map(v => (
                                                <button
                                                    key={v}
                                                    type="button"
                                                    onClick={() => insertVariable(v)}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg text-xs font-medium text-[var(--text-primary)] hover:bg-blue-500/10 hover:text-blue-500 hover:border-blue-500/30 transition-colors"
                                                >
                                                    <Copy className="w-3 h-3" /> {`{${v}}`}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Body */}
                                    <div>
                                        <label className="block text-sm font-bold text-[var(--text-secondary)] mb-2 uppercase tracking-wide">
                                            HTML Body Content
                                        </label>
                                        <textarea 
                                            value={formData.htmlBody}
                                            onChange={(e) => setFormData({...formData, htmlBody: e.target.value})}
                                            rows="18"
                                            className="w-full bg-[var(--bg-secondary)] text-[var(--text-primary)] border border-[var(--border-color)] rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-mono text-sm leading-relaxed custom-scrollbar"
                                            required
                                        />
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex justify-between items-center bg-[var(--bg-secondary)] p-4 rounded-xl border border-[var(--border-color)] mt-6">
                                    <div className="flex items-center gap-2">
                                        <AlertCircle className="w-4 h-4 text-amber-500" />
                                        <span className="text-xs text-[var(--text-secondary)]">Changes are applied immediately system-wide.</span>
                                    </div>
                                    <button 
                                        type="submit"
                                        className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition-colors shadow-lg shadow-blue-500/20"
                                    >
                                        {saveSuccess ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                                        {saveSuccess ? 'Saved!' : 'Save Template Changes'}
                                    </button>
                                </div>
                            </form>
                        ) : (
                            <div className="h-full min-h-[400px] flex items-center justify-center border-2 border-dashed border-[var(--border-color)] rounded-3xl">
                                <p className="text-[var(--text-secondary)]">Select a template to edit</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'logs' && (
                <div className="animate-in fade-in duration-300">
                    <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-[var(--card-bg)] border-b border-[var(--border-color)]">
                                        <th className="p-4 text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Timestamp</th>
                                        <th className="p-4 text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Template</th>
                                        <th className="p-4 text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Recipient</th>
                                        <th className="p-4 text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Subject</th>
                                        <th className="p-4 text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Status</th>
                                        <th className="p-4 text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Details</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--border-color)]">
                                    {logs.length === 0 ? (
                                        <tr>
                                            <td colSpan="6" className="p-8 text-center text-[var(--text-secondary)]">
                                                No email logs found.
                                            </td>
                                        </tr>
                                    ) : (
                                        logs.map((log) => (
                                            <tr key={log.id} className="hover:bg-[var(--hover-bg)] transition-colors">
                                                <td className="p-4 text-sm font-medium text-[var(--text-primary)]">
                                                    {new Date(log.createdAt).toLocaleString('en-US', { month: 'short', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
                                                </td>
                                                <td className="p-4">
                                                    <span className="px-2 py-1 bg-slate-500/10 text-slate-500 text-xs font-bold rounded-lg border border-slate-500/20">
                                                        {log.templateName}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-sm text-[var(--text-primary)]">{log.recipientEmail}</td>
                                                <td className="p-4 text-sm text-[var(--text-secondary)] max-w-[200px] truncate">{log.subject}</td>
                                                <td className="p-4">
                                                    <span className={`px-2.5 py-1 text-xs font-bold rounded-lg border ${
                                                        log.status === 'Sent' 
                                                            ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
                                                            : 'bg-rose-500/10 text-rose-500 border-rose-500/20'
                                                    }`}>
                                                        {log.status}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-xs text-[var(--text-secondary)]">
                                                    {log.errorMsg ? (
                                                        <span className="text-rose-500 truncate max-w-[150px] inline-block" title={log.errorMsg}>
                                                            {log.errorMsg}
                                                        </span>
                                                    ) : (
                                                        <span>Triggered by: {log.triggeredByObj || 'System'}</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EmailSettingsView;
