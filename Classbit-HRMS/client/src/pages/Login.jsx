import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { login } from '../slices/authSlice';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, Mail, Loader2, ShieldCheck, UserCheck } from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { loading, error } = useSelector((state) => state.auth);

    const handleSubmit = async (e) => {
        e.preventDefault();
        const result = await dispatch(login({ email, password }));
        if (!result.error) {
            if (result.payload.requirePasswordChange) {
                navigate('/force-change-password');
            } else {
                navigate('/dashboard');
            }
        }
    };

    // Auto-fill Demo Credentials Handler
    const handleDemoLogin = (demoEmail, demoPassword) => {
        setEmail(demoEmail);
        setPassword(demoPassword);
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)] px-4">
            <ThemeToggle />
            {/* Background blobs */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
                <div className="absolute top-1/4 -left-20 w-80 h-80 bg-blue-600/20 rounded-full blur-[120px]" />
                <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-indigo-600/20 rounded-full blur-[120px]" />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md relative z-10"
            >
                <div className="bg-[var(--card-bg)]/80 backdrop-blur-xl border border-[var(--border-color)] p-8 rounded-2xl shadow-2xl">
                    <div className="text-center mb-6">
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                            Classbit HRMS
                        </h1>
                        <p className="text-[var(--text-secondary)] mt-2">Welcome back! Please login to your account.</p>
                    </div>

                    {/* ========================================== */}
                    {/* DEMO CREDENTIALS SECTION FOR RECRUITERS   */}
                    {/* ========================================== */}
                    <div className="mb-6 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 backdrop-blur-md">
                        <p className="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-2 text-center">
                            ⚡ Quick Demo Access (Click to Auto-fill)
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={() => handleDemoLogin('cb.classsbit@gmail.com', 'Password@123')}
                                className="flex items-center justify-center gap-1.5 p-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)] hover:border-blue-500 hover:bg-blue-500/10 transition-all text-xs font-medium text-[var(--text-primary)] cursor-pointer"
                            >
                                <ShieldCheck className="w-4 h-4 text-blue-400" />
                                Admin Role
                            </button>
                            {/* <button
                                type="button"
                                onClick={() => handleDemoLogin('employee@classbit.com', 'User@123')}
                                className="flex items-center justify-center gap-1.5 p-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)] hover:border-indigo-500 hover:bg-indigo-500/10 transition-all text-xs font-medium text-[var(--text-primary)] cursor-pointer"
                            >
                                <UserCheck className="w-4 h-4 text-indigo-400" />
                                Employee Role
                            </button> */}
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div>
                            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Email Address</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg py-3 pl-11 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all text-[var(--text-primary)]"
                                    placeholder="admin@classbit.com"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg py-3 pl-11 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all text-[var(--text-primary)]"
                                    placeholder="••••••••"
                                    required
                                />
                            </div>
                        </div>

                        {error && (
                            <p className="text-red-400 text-sm bg-red-400/10 p-3 rounded-lg border border-red-400/20">
                                {error}
                            </p>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl font-semibold shadow-lg shadow-blue-900/20 transform transition-all active:scale-[0.98] disabled:opacity-70 flex items-center justify-center gap-2"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Sign In'}
                        </button>
                    </form>

                    <div className="mt-8 text-center text-sm text-[var(--text-secondary)]">
                        Forgot password? <button onClick={() => navigate('/forgot-password')} className="text-blue-500 hover:underline bg-transparent border-none">Reset it here</button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
};

export default Login;
