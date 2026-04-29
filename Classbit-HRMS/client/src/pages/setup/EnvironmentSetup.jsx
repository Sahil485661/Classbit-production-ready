import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Database, Mail, Server, Lock, Loader2, ChevronRight, ChevronLeft, Globe, KeyRound, HardDrive } from 'lucide-react';
import ThemeToggle from '../../components/ThemeToggle';
import axios from 'axios';

const EnvironmentSetup = () => {
    const [step, setStep] = useState(1);

    // DB Data
    const [dbHost, setDbHost] = useState('localhost');
    const [dbPort, setDbPort] = useState('3306');
    const [dbUser, setDbUser] = useState('root');
    const [dbPassword, setDbPassword] = useState('');
    const [dbName, setDbName] = useState('classbit_hrms');
    const [nodeEnv, setNodeEnv] = useState('development');

    // SMTP Data
    const [smtpUser, setSmtpUser] = useState('');
    const [smtpPassword, setSmtpPassword] = useState('');

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [successMessage, setSuccessMessage] = useState(null);

    const handleNext = (e) => {
        e.preventDefault();
        setError(null);
        setStep(2);
    };

    const handleBack = () => {
        setError(null);
        setStep(1);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        setSuccessMessage(null);
        
        try {
            const payload = {
                dbHost,
                dbPort,
                dbUser,
                dbPassword,
                dbName,
                smtpUser,
                smtpPassword,
                nodeEnv
            };

            const response = await axios.post('/api/setup/env', payload);
            
            if (response.status === 200) {
                setSuccessMessage("✅ Environment configured successfully. Restarting...");
                
                // The backend will call process.exit(0) and nodemon will restart it.
                // We'll wait a few seconds and then reload the browser to re-check setup state.
                setTimeout(() => {
                    window.location.href = '/setup-admin';
                }, 6000);
            }
        } catch (err) {
            setError(err.response?.data?.message || err.message || 'Environment Setup failed');
        } finally {
            setLoading(false);
        }
    };

    if (successMessage) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)] px-4">
                <ThemeToggle />
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 fixed">
                    <div className="absolute top-1/4 -left-20 w-80 h-80 bg-blue-600/20 rounded-full blur-[120px]" />
                    <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-indigo-600/20 rounded-full blur-[120px]" />
                </div>
                
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-[var(--card-bg)]/80 backdrop-blur-xl border border-[var(--border-color)] p-12 rounded-2xl shadow-2xl flex flex-col items-center justify-center max-w-md w-full text-center relative z-10"
                >
                    <div className="w-20 h-20 bg-blue-500/10 rounded-full flex items-center justify-center mb-6 relative">
                        <div className="absolute inset-0 rounded-full border-4 border-blue-500/20 border-t-blue-500 animate-spin"></div>
                        <Database className="w-8 h-8 text-blue-500 animate-pulse" />
                    </div>
                    <h2 className="text-2xl font-bold text-[var(--text-primary)] mb-3">Configuring System</h2>
                    <p className="text-[var(--text-secondary)] leading-relaxed">
                        Generating environment files, initializing the database, and rebooting the server.<br/><br/>
                        <span className="font-semibold text-blue-500">Please wait...</span>
                    </p>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)] px-4 py-12 overflow-y-auto">
            <ThemeToggle />
            {/* Background blobs */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 fixed">
                <div className="absolute top-1/4 -left-20 w-80 h-80 bg-blue-600/20 rounded-full blur-[120px]" />
                <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-indigo-600/20 rounded-full blur-[120px]" />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-lg relative z-10 my-auto"
            >
                <div className="bg-[var(--card-bg)]/80 backdrop-blur-xl border border-[var(--border-color)] p-8 rounded-2xl shadow-2xl overflow-hidden">
                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                            Environment Setup
                        </h1>
                        <p className="text-[var(--text-secondary)] mt-2">
                            {step === 1 ? 'Step 1: Database Configuration' : 'Step 2: SMTP Configuration'}
                        </p>
                    </div>

                    <div className="flex mb-6 space-x-2 justify-center">
                        <div className={`h-2 w-12 rounded-full transition-colors duration-300 ${step >= 1 ? 'bg-blue-500' : 'bg-[var(--border-color)]'}`}></div>
                        <div className={`h-2 w-12 rounded-full transition-colors duration-300 ${step >= 2 ? 'bg-blue-500' : 'bg-[var(--border-color)]'}`}></div>
                    </div>

                    {error && (
                        <p className="text-red-400 text-sm bg-red-400/10 p-3 rounded-lg border border-red-400/20 mb-6">
                            {error}
                        </p>
                    )}


                    <form onSubmit={step === 1 ? handleNext : handleSubmit} className="space-y-6 relative min-h-[350px]">
                        <AnimatePresence mode="wait">
                            {step === 1 && (
                                <motion.div
                                    key="step1"
                                    initial={{ opacity: 0, x: -50 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 50 }}
                                    transition={{ duration: 0.3 }}
                                    className="space-y-5"
                                >
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">DB Host</label>
                                            <div className="relative">
                                                <Server className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                                                <input
                                                    type="text"
                                                    value={dbHost}
                                                    onChange={(e) => setDbHost(e.target.value)}
                                                    className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg py-3 pl-10 pr-3 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-[var(--text-primary)]"
                                                    placeholder="localhost"
                                                    required
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">DB Port</label>
                                            <div className="relative">
                                                <HardDrive className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                                                <input
                                                    type="text"
                                                    value={dbPort}
                                                    onChange={(e) => setDbPort(e.target.value)}
                                                    className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg py-3 pl-10 pr-3 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-[var(--text-primary)]"
                                                    placeholder="3306"
                                                    required
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Database Name</label>
                                        <div className="relative">
                                            <Database className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
                                            <input
                                                type="text"
                                                value={dbName}
                                                onChange={(e) => setDbName(e.target.value)}
                                                className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg py-3 pl-11 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-[var(--text-primary)]"
                                                placeholder="classbit_hrms"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">DB User</label>
                                        <div className="relative">
                                            <Database className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
                                            <input
                                                type="text"
                                                value={dbUser}
                                                onChange={(e) => setDbUser(e.target.value)}
                                                className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg py-3 pl-11 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-[var(--text-primary)]"
                                                placeholder="root"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">DB Password</label>
                                        <div className="relative">
                                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
                                            <input
                                                type="password"
                                                value={dbPassword}
                                                onChange={(e) => setDbPassword(e.target.value)}
                                                className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg py-3 pl-11 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-[var(--text-primary)]"
                                                placeholder="••••••••"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Node Environment</label>
                                        <div className="relative">
                                            <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
                                            <select
                                                value={nodeEnv}
                                                onChange={(e) => setNodeEnv(e.target.value)}
                                                className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg py-3 pl-11 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-[var(--text-primary)] appearance-none"
                                            >
                                                <option value="development">Development</option>
                                                <option value="production">Production</option>
                                            </select>
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        className="w-full bg-blue-600 hover:bg-blue-500 text-white px-4 py-3 rounded-xl font-semibold shadow-lg shadow-blue-900/20 transform transition-all active:scale-[0.98] flex items-center justify-center gap-2 mt-6"
                                    >
                                        Next <ChevronRight className="w-5 h-5" />
                                    </button>
                                </motion.div>
                            )}

                            {step === 2 && (
                                <motion.div
                                    key="step2"
                                    initial={{ opacity: 0, x: 50 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -50 }}
                                    transition={{ duration: 0.3 }}
                                    className="space-y-5"
                                >
                                    <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 mb-6">
                                        <p className="text-sm text-[var(--text-secondary)]">
                                            SMTP credentials are required for sending system emails (like password resets). You can skip these for now and add them later.
                                        </p>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">SMTP Email</label>
                                        <div className="relative">
                                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
                                            <input
                                                type="email"
                                                value={smtpUser}
                                                onChange={(e) => setSmtpUser(e.target.value)}
                                                className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg py-3 pl-11 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-[var(--text-primary)]"
                                                placeholder="no-reply@classbit.com"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">SMTP Password</label>
                                        <div className="relative">
                                            <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
                                            <input
                                                type="password"
                                                value={smtpPassword}
                                                onChange={(e) => setSmtpPassword(e.target.value)}
                                                className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg py-3 pl-11 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-[var(--text-primary)]"
                                                placeholder="••••••••"
                                            />
                                        </div>
                                    </div>

                                    <div className="flex gap-4 mt-6 pt-4">
                                        <button
                                            type="button"
                                            onClick={handleBack}
                                            disabled={loading || successMessage !== null}
                                            className="w-1/3 bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] hover:bg-[var(--hover-bg)] px-4 py-3 rounded-xl font-semibold transition-all flex items-center justify-center disabled:opacity-50"
                                        >
                                            <ChevronLeft className="w-5 h-5" /> Back
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={loading || successMessage !== null}
                                            className="w-2/3 bg-blue-600 hover:bg-blue-500 text-white px-4 py-3 rounded-xl font-semibold shadow-lg shadow-blue-900/20 transform transition-all active:scale-[0.98] disabled:opacity-70 flex items-center justify-center gap-2"
                                        >
                                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Generate .env'}
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </form>
                </div>
            </motion.div>
        </div>
    );
};

export default EnvironmentSetup;
