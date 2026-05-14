import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Building, Globe, Mail, Phone, MapPin, Save, CloudUpload } from 'lucide-react';

const CompanySettings = () => {
    const [settings, setSettings] = useState({
        companyName: 'Classbit Technologies',
        website: 'https://classbit.com',
        contactEmail: 'admin@classbit.com',
        phone: '+1 (555) 000-1111',
        address: '123 Tech Avenue, Silicon Valley, CA',
        currency: 'USD',
        timezone: 'UTC-8 (Pacific Time)'
    });
    const [logo, setLogo] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const token = localStorage.getItem('token');
                const res = await axios.get('/api/setup/company', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                
                if (res.data && res.data.id) {
                    setSettings({
                        companyName: res.data.name || '',
                        website: res.data.website || '',
                        contactEmail: res.data.contactEmail || '',
                        phone: res.data.contactNumber || '',
                        address: res.data.address || '',
                        currency: res.data.currency || 'USD',
                        timezone: res.data.timezone || 'UTC-8 (Pacific Time)'
                    });
                }
            } catch (error) {
                console.error('Failed to load company details', error);
            }
        };
        fetchSettings();
    }, []);

    const handleSave = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const formData = new FormData();
            formData.append('name', settings.companyName);
            formData.append('website', settings.website);
            formData.append('contactEmail', settings.contactEmail);
            formData.append('contactNumber', settings.phone);
            formData.append('address', settings.address);
            formData.append('currency', settings.currency);
            formData.append('timezone', settings.timezone);
            if (logo) {
                formData.append('logo', logo);
            }

            await axios.post('/api/setup/company', formData, {
                headers: { 
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                }
            });
            alert('Settings saved successfully!');
            // Refresh to get the new logo
            window.location.reload();
        } catch (err) {
            alert('Failed to save settings');
        } finally {
            setLoading(false);
        }
    };

    const inputClass = "w-full bg-slate-900 border border-slate-700 rounded-xl py-2.5 px-10 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm";
    const labelClass = "text-xs font-bold text-slate-500 uppercase tracking-widest mb-1.5 block ml-1";

    return (
        <div className="max-w-4xl mx-auto text-left">
            <div className="flex justify-between items-center mb-8">
                <h2 className="text-xl font-bold text-slate-100 italic">Corporate Profile</h2>
                <button
                    onClick={handleSave}
                    disabled={loading}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 shadow-lg shadow-blue-900/20"
                >
                    {loading ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save className="w-4 h-4" />}
                    Update Firm Details
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                    <div>
                        <label className={labelClass}>Company Legal Name</label>
                        <div className="relative">
                            <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                            <input
                                type="text"
                                className={inputClass}
                                value={settings.companyName}
                                onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
                            />
                        </div>
                    </div>

                    <div>
                        <label className={labelClass}>Corporate Website</label>
                        <div className="relative">
                            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                            <input
                                type="text"
                                className={inputClass}
                                value={settings.website}
                                onChange={(e) => setSettings({ ...settings, website: e.target.value })}
                            />
                        </div>
                    </div>

                    <div>
                        <label className={labelClass}>Primary Contact Email</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                            <input
                                type="email"
                                className={inputClass}
                                value={settings.contactEmail}
                                onChange={(e) => setSettings({ ...settings, contactEmail: e.target.value })}
                            />
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    <div>
                        <label className={labelClass}>Company Logo</label>
                        <div className="relative">
                            <CloudUpload className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                            <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => {
                                    if (e.target.files && e.target.files[0]) {
                                        setLogo(e.target.files[0]);
                                    }
                                }}
                                className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2 pl-10 pr-4 text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-sm file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-xs file:font-bold file:bg-blue-600/20 file:text-blue-400 hover:file:bg-blue-600/30"
                            />
                        </div>
                        {logo && <p className="text-xs text-blue-400 mt-2 ml-1">New logo selected: {logo.name}</p>}
                    </div>

                    <div>
                        <label className={labelClass}>Direct Phone Line</label>
                        <div className="relative">
                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                            <input
                                type="text"
                                className={inputClass}
                                value={settings.phone}
                                onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                            />
                        </div>
                    </div>

                    <div>
                        <label className={labelClass}>Global Currency</label>
                        <select
                            className="w-full bg-slate-900 border border-slate-700 rounded-xl py-2.5 px-4 text-slate-200"
                            value={settings.currency}
                            onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
                        >
                            <option value="USD">USD - US Dollar</option>
                            <option value="EUR">EUR - Euro</option>
                            <option value="GBP">GBP - British Pound</option>
                            <option value="INR">INR - Indian Rupee</option>
                        </select>
                    </div>

                    <div>
                        <label className={labelClass}>Corporate HQ Address</label>
                        <div className="relative">
                            <MapPin className="absolute left-3 top-4 w-4 h-4 text-slate-500" />
                            <textarea
                                rows="3"
                                className={`${inputClass} !py-3`}
                                value={settings.address}
                                onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CompanySettings;
