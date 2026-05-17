import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
    Mail, Settings2, Activity, Save, AlertCircle, Copy, 
    CheckCircle2, History, Plus, Trash2, X, Send, ShieldCheck, 
    Server, User as UserIcon, Lock, Hash
} from 'lucide-react';

const API = '/api';

const EmailSettingsView = () => {
    const [activeTab, setActiveTab] = useState('templates'); // 'templates', 'logs', or 'smtp'
    const [templates, setTemplates] = useState([]);
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedTemplate, setSelectedTemplate] = useState(null);
    const [formData, setFormData] = useState({ name: '', subject: '', htmlBody: '', description: '' });
    const [saveSuccess, setSaveSuccess] = useState(false);
    
    // SMTP State
    const [smtpConfig, setSmtpConfig] = useState({ 
        host: '', 
        port: '', 
        user: '', 
        pass: '', 
        secure: false,
        service: 'custom'
    });

    const [testingSmtp, setTestingSmtp] = useState(false);
    const [testResult, setTestResult] = useState(null);

    // Modal State
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newTemplate, setNewTemplate] = useState({ name: '', subject: '', htmlBody: '<h1>Hello {employee_name}</h1>', description: '' });

    useEffect(() => {
        fetchTemplates();
        fetchLogs();
        fetchSmtpSettings();
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

    const fetchSmtpSettings = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get(`${API}/email-settings/smtp`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSmtpConfig(prev => ({
                ...prev,
                ...res.data,
                service: res.data.service || 'custom'
            }));
        } catch (error) {
            console.error('Failed to fetch SMTP settings', error);
        }
    };

    const handleSelectTemplate = (t) => {
        setSelectedTemplate(t);
        setFormData({ name: t.name, subject: t.subject, htmlBody: t.htmlBody, description: t.description || '' });
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

    const handleCreateTemplate = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            await axios.post(`${API}/email-settings/templates`, newTemplate, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setShowCreateModal(false);
            setNewTemplate({ name: '', subject: '', htmlBody: '<h1>Hello {employee_name}</h1>', description: '' });
            fetchTemplates();
        } catch (error) {
            console.error('Failed to create template', error);
            alert(error.response?.data?.message || 'Failed to create template');
        }
    };

    const handleDeleteTemplate = async (id) => {
        if (!window.confirm('Are you sure you want to delete this template? This cannot be undone.')) return;
        try {
            const token = localStorage.getItem('token');
            await axios.delete(`${API}/email-settings/templates/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (selectedTemplate?.id === id) setSelectedTemplate(null);
            fetchTemplates();
        } catch (error) {
            console.error('Failed to delete template', error);
            alert('Failed to delete template');
        }
    };

    const handleUpdateSmtp = async (e) => {
        e.preventDefault();
        try {
            const token = localStorage.getItem('token');
            await axios.post(`${API}/email-settings/smtp`, smtpConfig, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert('SMTP settings updated successfully');
        } catch (error) {
            console.error('Failed to update SMTP', error);
            alert('Failed to update SMTP settings');
        }
    };

    const handleTestSmtp = async () => {
        setTestingSmtp(true);
        setTestResult(null);
        try {
            const token = localStorage.getItem('token');
            const res = await axios.post(`${API}/email-settings/smtp/test`, smtpConfig, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setTestResult({ success: true, message: res.data.message });
        } catch (error) {
            setTestResult({ 
                success: false, 
                message: error.response?.data?.message || 'Connection failed',
                details: error.response?.data?.error
            });
        } finally {
            setTestingSmtp(false);
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
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                            activeTab === 'templates' 
                            ? 'bg-blue-600 text-white shadow-md' 
                            : 'text-[var(--text-secondary)] hover:text-blue-500 hover:bg-[var(--hover-bg)]'
                        }`}
                    >
                        <Settings2 className="w-4 h-4" /> Templates
                    </button>
                    <button 
                        onClick={() => setActiveTab('smtp')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                            activeTab === 'smtp' 
                            ? 'bg-blue-600 text-white shadow-md' 
                            : 'text-[var(--text-secondary)] hover:text-blue-500 hover:bg-[var(--hover-bg)]'
                        }`}
                    >
                        <ShieldCheck className="w-4 h-4" /> SMTP Config
                    </button>
                    <button 
                        onClick={() => setActiveTab('logs')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
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
                        <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] p-4 rounded-2xl flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center text-blue-500">
                                    <Mail className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-[var(--text-primary)]">Templates</h3>
                                    <p className="text-xs text-[var(--text-secondary)]">{templates.length} Active</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setShowCreateModal(true)}
                                className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 transition-colors shadow-sm"
                            >
                                <Plus className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="flex flex-col gap-2 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                            {templates.map(t => (
                                <div key={t.id} className="group relative">
                                    <button 
                                        onClick={() => handleSelectTemplate(t)}
                                        className={`w-full text-left p-4 rounded-xl border transition-all ${
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
                                        <p className="text-xs text-[var(--text-secondary)] line-clamp-2">{t.description || 'No description provided'}</p>
                                    </button>
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); handleDeleteTemplate(t.id); }}
                                        className="absolute top-2 right-2 p-1.5 text-rose-500 opacity-0 group-hover:opacity-100 hover:bg-rose-500/10 rounded-lg transition-all"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right Area - Editor */}
                    <div className="lg:col-span-8">
                        {selectedTemplate ? (
                            <form onSubmit={handleUpdateTemplate} className="space-y-4">
                                <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl p-6 space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-[var(--text-secondary)] mb-2 uppercase tracking-wide">
                                                Template Identifier
                                            </label>
                                            <input 
                                                type="text"
                                                value={formData.name}
                                                disabled
                                                className="w-full bg-[var(--card-bg)] text-[var(--text-secondary)] border border-[var(--border-color)] rounded-xl px-4 py-3 cursor-not-allowed opacity-70"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-[var(--text-secondary)] mb-2 uppercase tracking-wide">
                                                Email Subject
                                            </label>
                                            <input 
                                                type="text"
                                                value={formData.subject}
                                                onChange={(e) => setFormData({...formData, subject: e.target.value})}
                                                className="w-full bg-[var(--card-bg)] text-[var(--text-primary)] border border-[var(--border-color)] rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-all"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-[var(--text-secondary)] mb-2 uppercase tracking-wide">
                                            Description
                                        </label>
                                        <input 
                                            type="text"
                                            value={formData.description}
                                            onChange={(e) => setFormData({...formData, description: e.target.value})}
                                            placeholder="What is this template used for?"
                                            className="w-full bg-[var(--card-bg)] text-[var(--text-primary)] border border-[var(--border-color)] rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-all"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-[var(--text-secondary)] mb-2 uppercase tracking-wide">
                                            Quick Variables (Click to insert)
                                        </label>
                                        <div className="flex flex-wrap gap-2">
                                            {commonVariables.map(v => (
                                                <button
                                                    key={v}
                                                    type="button"
                                                    onClick={() => insertVariable(v)}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--card-bg)] border border-[var(--border-color)] rounded-lg text-xs font-medium text-[var(--text-primary)] hover:bg-blue-500/10 hover:text-blue-500 hover:border-blue-500/30 transition-colors"
                                                >
                                                    <Copy className="w-3 h-3" /> {`{${v}}`}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-[var(--text-secondary)] mb-2 uppercase tracking-wide">
                                            HTML Body Content
                                        </label>
                                        <textarea 
                                            value={formData.htmlBody}
                                            onChange={(e) => setFormData({...formData, htmlBody: e.target.value})}
                                            rows="14"
                                            className="w-full bg-[var(--card-bg)] text-[var(--text-primary)] border border-[var(--border-color)] rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-all font-mono text-sm leading-relaxed custom-scrollbar"
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="flex justify-between items-center bg-[var(--bg-secondary)] p-4 rounded-xl border border-[var(--border-color)]">
                                    <div className="flex items-center gap-2">
                                        <AlertCircle className="w-4 h-4 text-amber-500" />
                                        <span className="text-xs text-[var(--text-secondary)]">Changes are applied immediately.</span>
                                    </div>
                                    <button 
                                        type="submit"
                                        className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg transition-colors shadow-lg shadow-blue-500/20"
                                    >
                                        {saveSuccess ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                                        {saveSuccess ? 'Saved!' : 'Save Template'}
                                    </button>
                                </div>
                            </form>
                        ) : (
                            <div className="h-full min-h-[500px] flex flex-col items-center justify-center border-2 border-dashed border-[var(--border-color)] rounded-3xl bg-[var(--bg-secondary)]/30">
                                <Mail className="w-12 h-12 text-[var(--text-secondary)] mb-4 opacity-20" />
                                <p className="text-[var(--text-secondary)] font-medium">Select a template to edit or create a new one</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeTab === 'smtp' && (
                <div className="max-w-3xl mx-auto animate-in slide-in-from-bottom-4 duration-300">
                    <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-3xl overflow-hidden shadow-xl">
                        <div className="p-8 border-b border-[var(--border-color)] bg-blue-600/5">
                            <div className="flex items-center gap-4 mb-4">
                                <div className="w-12 h-12 bg-blue-600 text-white rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
                                    <Server className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold text-[var(--text-primary)]">SMTP Server Configuration</h3>
                                    <p className="text-[var(--text-secondary)]">Setup your mail server to enable notifications and OTPs.</p>
                                </div>
                            </div>
                            
                            {testResult && (
                                <div className={`p-4 rounded-xl flex items-start gap-3 border animate-in fade-in slide-in-from-top-2 ${
                                    testResult.success 
                                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600' 
                                        : 'bg-rose-500/10 border-rose-500/20 text-rose-600'
                                }`}>
                                    {testResult.success ? <CheckCircle2 className="w-5 h-5 mt-0.5" /> : <AlertCircle className="w-5 h-5 mt-0.5" />}
                                    <div className="flex-1">
                                        <p className="font-bold">{testResult.message}</p>
                                        {testResult.details && <p className="text-xs mt-1 opacity-80 font-mono break-all">{testResult.details}</p>}
                                    </div>
                                    <button onClick={() => setTestResult(null)} className="p-1 hover:bg-black/5 rounded-lg transition-colors">
                                        <X className="w-4 h-4"/>
                                    </button>
                                </div>
                            )}
                        </div>

                        <form onSubmit={handleUpdateSmtp} className="p-8 space-y-6">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-[var(--text-secondary)] flex items-center gap-2">
                                    <Activity className="w-4 h-4" /> Select Service
                                </label>
                                <select 
                                    value={smtpConfig.service}
                                    onChange={e => {
                                        const val = e.target.value;
                                        setSmtpConfig(prev => ({
                                            ...prev, 
                                            service: val,
                                            host: val === 'custom' ? prev.host : '',
                                            port: val === 'custom' ? prev.port : ''
                                        }));
                                    }}
                                    className="w-full bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-all font-medium"
                                >
                                    <option value="custom">Custom (Manual Config)</option>
                                    <option value="gmail">Gmail</option>
                                    <option value="outlook">Outlook / Office 365</option>
                                    <option value="hotmail">Hotmail</option>
                                    <option value="yahoo">Yahoo</option>
                                    <option value="icloud">iCloud</option>
                                </select>
                            </div>

                            {smtpConfig.service === 'custom' && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in duration-200">
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-[var(--text-secondary)] flex items-center gap-2">
                                            <Server className="w-4 h-4" /> SMTP Host
                                        </label>
                                        <input 
                                            type="text"
                                            value={smtpConfig.host}
                                            onChange={e => setSmtpConfig({...smtpConfig, host: e.target.value})}
                                            className="w-full bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-all"
                                            placeholder="e.g. smtp.gmail.com"
                                            required={smtpConfig.service === 'custom'}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-[var(--text-secondary)] flex items-center gap-2">
                                            <Hash className="w-4 h-4" /> SMTP Port
                                        </label>
                                        <input 
                                            type="text"
                                            value={smtpConfig.port}
                                            onChange={e => setSmtpConfig({...smtpConfig, port: e.target.value})}
                                            className="w-full bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-all"
                                            placeholder="e.g. 587 or 465"
                                            required={smtpConfig.service === 'custom'}
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-[var(--text-secondary)] flex items-center gap-2">
                                        <UserIcon className="w-4 h-4" /> Email Address
                                    </label>
                                    <input 
                                        type="text"
                                        value={smtpConfig.user}
                                        onChange={e => setSmtpConfig({...smtpConfig, user: e.target.value})}
                                        className="w-full bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-all"
                                        placeholder="your-email@gmail.com or username"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-[var(--text-secondary)] flex items-center gap-2">
                                        <Lock className="w-4 h-4" /> App Password / Secret
                                    </label>
                                    <input 
                                        type="password"
                                        value={smtpConfig.pass}
                                        onChange={e => setSmtpConfig({...smtpConfig, pass: e.target.value})}
                                        className="w-full bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-all"
                                        placeholder="••••••••••••"
                                        required
                                    />
                                </div>
                            </div>

                            {smtpConfig.service === 'custom' && (
                                <div className="flex items-center gap-3 p-4 bg-slate-500/5 rounded-2xl border border-[var(--border-color)]">
                                    <input 
                                        type="checkbox"
                                        id="secure-smtp"
                                        checked={smtpConfig.secure}
                                        onChange={e => setSmtpConfig({...smtpConfig, secure: e.target.checked})}
                                        className="w-5 h-5 rounded-md border-[var(--border-color)] text-blue-600 focus:ring-blue-500"
                                    />
                                    <label htmlFor="secure-smtp" className="text-sm font-medium text-[var(--text-primary)] cursor-pointer">
                                        Use SSL/TLS (Required for Port 465)
                                    </label>
                                </div>
                            )}

                            <div className="flex flex-col sm:flex-row gap-4 pt-4">
                                <button 
                                    type="button"
                                    onClick={handleTestSmtp}
                                    disabled={testingSmtp}
                                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-[var(--card-bg)] border border-[var(--border-color)] hover:border-blue-500 text-[var(--text-primary)] font-bold rounded-xl transition-all disabled:opacity-50"
                                >
                                    {testingSmtp ? <Activity className="w-5 h-5 animate-spin text-blue-500" /> : <Send className="w-5 h-5 text-blue-500" />}
                                    {testingSmtp ? 'Verifying...' : 'Test Connection'}
                                </button>
                                <button 
                                    type="submit"
                                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-blue-500/20"
                                >
                                    <Save className="w-5 h-5" /> Save Changes
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}


            {activeTab === 'logs' && (
                <div className="animate-in fade-in duration-300">
                    <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-[var(--card-bg)] border-b border-[var(--border-color)]">
                                        <th className="p-4 text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Timestamp</th>
                                        <th className="p-4 text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Template</th>
                                        <th className="p-4 text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Recipient</th>
                                        <th className="p-4 text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Status</th>
                                        <th className="p-4 text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider">Details</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-[var(--border-color)]">
                                    {logs.length === 0 ? (
                                        <tr>
                                            <td colSpan="5" className="p-12 text-center text-[var(--text-secondary)]">
                                                <History className="w-10 h-10 mx-auto mb-4 opacity-10" />
                                                <p>No email communication logs found.</p>
                                            </td>
                                        </tr>
                                    ) : (
                                        logs.map((log) => (
                                            <tr key={log.id} className="hover:bg-[var(--hover-bg)] transition-colors">
                                                <td className="p-4 text-sm font-medium text-[var(--text-primary)]">
                                                    {new Date(log.createdAt).toLocaleString()}
                                                </td>
                                                <td className="p-4">
                                                    <span className="px-2 py-1 bg-blue-500/10 text-blue-500 text-[10px] font-bold rounded uppercase border border-blue-500/20">
                                                        {log.templateName}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-sm text-[var(--text-primary)]">{log.recipientEmail}</td>
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
                                                        <span className="text-rose-500 truncate max-w-[200px] inline-block" title={log.errorMsg}>
                                                            {log.errorMsg}
                                                        </span>
                                                    ) : (
                                                        <span>Source: {log.triggeredByObj || 'System'}</span>
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

            {/* Create Template Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-6 border-b border-[var(--border-color)] flex justify-between items-center bg-blue-600/5">
                            <h3 className="text-xl font-bold text-[var(--text-primary)]">Create New Template</h3>
                            <button onClick={() => setShowCreateModal(false)} className="p-2 hover:bg-[var(--hover-bg)] rounded-xl transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <form onSubmit={handleCreateTemplate} className="p-6 space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-[var(--text-secondary)] mb-2 uppercase tracking-wide">Identifier (NAME_IN_CAPS)</label>
                                    <input 
                                        type="text"
                                        value={newTemplate.name}
                                        onChange={e => setNewTemplate({...newTemplate, name: e.target.value.toUpperCase().replace(/\s+/g, '_')})}
                                        className="w-full bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-all font-mono"
                                        placeholder="E.G. NEW_HIRE_WELCOME"
                                        required
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-[var(--text-secondary)] mb-2 uppercase tracking-wide">Subject Line</label>
                                    <input 
                                        type="text"
                                        value={newTemplate.subject}
                                        onChange={e => setNewTemplate({...newTemplate, subject: e.target.value})}
                                        className="w-full bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-all"
                                        placeholder="Welcome to the Team!"
                                        required
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-[var(--text-secondary)] mb-2 uppercase tracking-wide">Description</label>
                                <input 
                                    type="text"
                                    value={newTemplate.description}
                                    onChange={e => setNewTemplate({...newTemplate, description: e.target.value})}
                                    className="w-full bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-all"
                                    placeholder="Used when a new employee is registered..."
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-[var(--text-secondary)] mb-2 uppercase tracking-wide">HTML Body</label>
                                <textarea 
                                    value={newTemplate.htmlBody}
                                    onChange={e => setNewTemplate({...newTemplate, htmlBody: e.target.value})}
                                    rows="10"
                                    className="w-full bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl px-4 py-3 focus:outline-none focus:border-blue-500 transition-all font-mono text-sm"
                                    required
                                />
                            </div>
                            <div className="flex gap-3 pt-4">
                                <button 
                                    type="button"
                                    onClick={() => setShowCreateModal(false)}
                                    className="flex-1 px-6 py-3 bg-[var(--card-bg)] border border-[var(--border-color)] text-[var(--text-primary)] font-bold rounded-xl hover:bg-[var(--hover-bg)]"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="submit"
                                    className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20"
                                >
                                    Create Template
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EmailSettingsView;
