import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Save, Plus, Trash2, ShieldAlert, BadgePercent, IndianRupee, Landmark } from 'lucide-react';

const StatutorySettings = () => {
    const [config, setConfig] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const fetchConfig = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await axios.get('/api/setup/compliance', {
                headers: { Authorization: `Bearer ${token}` }
            });
            let data = res.data;
            if (typeof data === 'string') data = JSON.parse(data);
            
            // Deep fallback structure to prevent undefined crashes
            setConfig({
                pf: data?.pf || { enabled: false, employeePercent: 12, employerPercent: 12, basicCap: 15000 },
                esi: data?.esi || { enabled: false, employeePercent: 0.75, employerPercent: 3.25, maxGross: 21000 },
                tds: data?.tds || { enabled: false, percent: 10, monthlyThreshold: 50000 },
                pt: data?.pt || { enabled: false, slabs: [] }
            });
        } catch (err) {
            console.error('Error fetching statutory config:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchConfig();
    }, []);

    const handleSave = async () => {
        setSaving(true);
        try {
            const token = localStorage.getItem('token');
            await axios.put('/api/setup/compliance', config, {
                headers: { Authorization: `Bearer ${token}` }
            });
            alert('Statutory compliance settings saved successfully!');
        } catch (err) {
            alert('Failed to save settings: ' + (err.response?.data?.message || err.message));
        } finally {
            setSaving(false);
        }
    };

    const handleAddSlab = () => {
        const lastMax = config.pt.slabs.length > 0 ? config.pt.slabs[config.pt.slabs.length - 1].max : 0;
        const newSlab = { min: lastMax + 1, max: lastMax + 5000, deduction: 0 };
        setConfig({
            ...config,
            pt: { ...config.pt, slabs: [...config.pt.slabs, newSlab] }
        });
    };

    const handleRemoveSlab = (idx) => {
        const newSlabs = config.pt.slabs.filter((s, i) => i !== idx);
        setConfig({ ...config, pt: { ...config.pt, slabs: newSlabs } });
    };

    const handleSlabChange = (idx, field, val) => {
        const newSlabs = [...config.pt.slabs];
        newSlabs[idx][field] = Number(val);
        setConfig({ ...config, pt: { ...config.pt, slabs: newSlabs } });
    };

    if (loading) return <div>Loading compliance engine...</div>;
    if (!config) return <div>Error loading compliance configuration.</div>;

    const Switch = ({ checked, onChange }) => (
        <button
            onClick={onChange}
            className={`w-12 h-6 rounded-full transition-colors relative flex items-center ${checked ? 'bg-green-500' : 'bg-gray-400'}`}
        >
            <div className={`w-4 h-4 rounded-full bg-white absolute transition-transform ${checked ? 'translate-x-7' : 'translate-x-1'}`} />
        </button>
    );

    return (
        <div className="space-y-8 animate-in fade-in duration-500 text-left">
            <div className="flex justify-between items-center border-b border-[var(--border-color)] pb-4">
                <div>
                    <h2 className="text-xl font-bold text-[var(--text-primary)] italic flex items-center gap-2">
                        <Landmark className="w-6 h-6 text-blue-500" />
                        Statutory Compliance Architecture
                    </h2>
                    <p className="text-sm text-[var(--text-secondary)] mt-1">Configure backend calculation formulas for Indian payroll laws.</p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-all disabled:opacity-50"
                >
                    <Save className="w-4 h-4" />
                    {saving ? 'Compiling...' : 'Save Configuration'}
                </button>
            </div>

            {/* PF Config */}
            <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl p-6">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
                        <ShieldAlert className="w-5 h-5 text-indigo-500" />
                        Provident Fund (PF)
                    </h3>
                    <Switch
                        checked={config.pf.enabled}
                        onChange={() => setConfig({ ...config, pf: { ...config.pf, enabled: !config.pf.enabled } })}
                    />
                </div>
                {config.pf.enabled && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <label className="text-xs font-bold text-[var(--text-secondary)] uppercase block mb-2">Employee Share (%)</label>
                            <div className="relative">
                                <BadgePercent className="w-4 h-4 absolute left-3 top-3 text-[var(--text-secondary)]" />
                                <input
                                    type="number"
                                    className="w-full bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl pl-10 pr-4 py-2 text-[var(--text-primary)] focus:ring-2 focus:ring-blue-500/50"
                                    value={config.pf.employeePercent}
                                    onChange={(e) => setConfig({ ...config, pf: { ...config.pf, employeePercent: Number(e.target.value) } })}
                                />
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-[var(--text-secondary)] uppercase block mb-2">Employer Share (%)</label>
                            <div className="relative">
                                <BadgePercent className="w-4 h-4 absolute left-3 top-3 text-[var(--text-secondary)]" />
                                <input
                                    type="number"
                                    className="w-full bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl pl-10 pr-4 py-2 text-[var(--text-primary)] focus:ring-2 focus:ring-blue-500/50"
                                    value={config.pf.employerPercent}
                                    onChange={(e) => setConfig({ ...config, pf: { ...config.pf, employerPercent: Number(e.target.value) } })}
                                />
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-[var(--text-secondary)] uppercase block mb-2">Basic Salary Cap Limit (₹)</label>
                            <div className="relative">
                                <IndianRupee className="w-4 h-4 absolute left-3 top-3 text-[var(--text-secondary)]" />
                                <input
                                    type="number"
                                    className="w-full bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl pl-10 pr-4 py-2 text-[var(--text-primary)] focus:ring-2 focus:ring-blue-500/50"
                                    value={config.pf.basicCap}
                                    onChange={(e) => setConfig({ ...config, pf: { ...config.pf, basicCap: Number(e.target.value) } })}
                                    title="Deduction will only apply up to this basic salary amount. Set 0 for unlimited."
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* ESI Config */}
            <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl p-6">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
                        <ShieldAlert className="w-5 h-5 text-green-500" />
                        Employee State Insurance (ESI)
                    </h3>
                    <Switch
                        checked={config.esi.enabled}
                        onChange={() => setConfig({ ...config, esi: { ...config.esi, enabled: !config.esi.enabled } })}
                    />
                </div>
                {config.esi.enabled && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div>
                            <label className="text-xs font-bold text-[var(--text-secondary)] uppercase block mb-2">Employee Deduction (%)</label>
                            <div className="relative">
                                <BadgePercent className="w-4 h-4 absolute left-3 top-3 text-[var(--text-secondary)]" />
                                <input
                                    type="number"
                                    step="0.01"
                                    className="w-full bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl pl-10 pr-4 py-2 text-[var(--text-primary)] focus:ring-2 focus:ring-blue-500/50"
                                    value={config.esi.employeePercent}
                                    onChange={(e) => setConfig({ ...config, esi: { ...config.esi, employeePercent: Number(e.target.value) } })}
                                />
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-[var(--text-secondary)] uppercase block mb-2">Max Gross Applicability (₹)</label>
                            <div className="relative">
                                <IndianRupee className="w-4 h-4 absolute left-3 top-3 text-[var(--text-secondary)]" />
                                <input
                                    type="number"
                                    className="w-full bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl pl-10 pr-4 py-2 text-[var(--text-primary)] focus:ring-2 focus:ring-blue-500/50"
                                    value={config.esi.maxGross}
                                    onChange={(e) => setConfig({ ...config, esi: { ...config.esi, maxGross: Number(e.target.value) } })}
                                    title="ESI applies only to employees earning below or equal to this Gross Amount."
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* TDS Config */}
            <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl p-6">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
                        <ShieldAlert className="w-5 h-5 text-red-500" />
                        Simplified TDS (Tax Deducted at Source)
                    </h3>
                    <Switch
                        checked={config.tds.enabled}
                        onChange={() => setConfig({ ...config, tds: { ...config.tds, enabled: !config.tds.enabled } })}
                    />
                </div>
                {config.tds.enabled && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="text-xs font-bold text-[var(--text-secondary)] uppercase block mb-2">Monthly Income Threshold (₹)</label>
                            <div className="relative">
                                <IndianRupee className="w-4 h-4 absolute left-3 top-3 text-[var(--text-secondary)]" />
                                <input
                                    type="number"
                                    className="w-full bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl pl-10 pr-4 py-2 text-[var(--text-primary)] focus:ring-2 focus:ring-blue-500/50"
                                    value={config.tds.monthlyThreshold}
                                    onChange={(e) => setConfig({ ...config, tds: { ...config.tds, monthlyThreshold: Number(e.target.value) } })}
                                />
                            </div>
                        </div>
                        <div>
                            <label className="text-xs font-bold text-[var(--text-secondary)] uppercase block mb-2">Standard Deduction Rate (%)</label>
                            <div className="relative">
                                <BadgePercent className="w-4 h-4 absolute left-3 top-3 text-[var(--text-secondary)]" />
                                <input
                                    type="number"
                                    className="w-full bg-[var(--card-bg)] border border-[var(--border-color)] rounded-xl pl-10 pr-4 py-2 text-[var(--text-primary)] focus:ring-2 focus:ring-blue-500/50"
                                    value={config.tds.percent}
                                    onChange={(e) => setConfig({ ...config, tds: { ...config.tds, percent: Number(e.target.value) } })}
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* PT Dynamic Table */}
            <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl p-6">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
                        <ShieldAlert className="w-5 h-5 text-orange-500" />
                        Professional Tax (Slab Based)
                    </h3>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={handleAddSlab}
                            className="bg-blue-600/10 text-blue-500 hover:bg-blue-600 hover:text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all"
                        >
                            <Plus className="w-3 h-3" /> Add Slab
                        </button>
                        <Switch
                            checked={config.pt.enabled}
                            onChange={() => setConfig({ ...config, pt: { ...config.pt, enabled: !config.pt.enabled } })}
                        />
                    </div>
                </div>

                {config.pt.enabled && (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-[var(--border-color)]">
                                    <th className="py-3 px-4 text-xs font-bold text-[var(--text-secondary)] uppercase">Gross Min (₹)</th>
                                    <th className="py-3 px-4 text-xs font-bold text-[var(--text-secondary)] uppercase">Gross Max (₹)</th>
                                    <th className="py-3 px-4 text-xs font-bold text-[var(--text-secondary)] uppercase">Deduction (₹)</th>
                                    <th className="py-3 px-4 text-center"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {config.pt.slabs.map((slab, index) => (
                                    <tr key={index} className="border-b border-[var(--border-color)] hover:bg-[var(--hover-bg)] transition-colors">
                                        <td className="py-2 px-4">
                                            <input
                                                type="number"
                                                className="w-full bg-transparent border border-[var(--border-color)] rounded-xl px-3 py-1.5 text-[var(--text-primary)] focus:ring-2 focus:ring-blue-500/50"
                                                value={slab.min}
                                                onChange={(e) => handleSlabChange(index, 'min', e.target.value)}
                                            />
                                        </td>
                                        <td className="py-2 px-4">
                                            <input
                                                type="number"
                                                className="w-full bg-transparent border border-[var(--border-color)] rounded-xl px-3 py-1.5 text-[var(--text-primary)] focus:ring-2 focus:ring-blue-500/50"
                                                value={slab.max}
                                                onChange={(e) => handleSlabChange(index, 'max', e.target.value)}
                                            />
                                        </td>
                                        <td className="py-2 px-4">
                                            <input
                                                type="number"
                                                className="w-full bg-transparent border border-[var(--border-color)] rounded-xl px-3 py-1.5 text-[var(--text-primary)] focus:ring-2 focus:ring-blue-500/50"
                                                value={slab.deduction}
                                                onChange={(e) => handleSlabChange(index, 'deduction', e.target.value)}
                                            />
                                        </td>
                                        <td className="py-2 px-4 text-center">
                                            <button
                                                onClick={() => handleRemoveSlab(index)}
                                                className="p-1.5 text-[var(--text-secondary)] hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {config.pt.slabs.length === 0 && (
                                    <tr>
                                        <td colSpan="4" className="py-6 text-center text-sm text-[var(--text-secondary)] italic">
                                            No tax brackets defined. Add a slab to configure.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default StatutorySettings;
