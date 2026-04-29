import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Mail, Loader2, ArrowLeft, KeyRound } from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';

const ForgotPassword = () => {
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            await axios.post('/api/auth/forgot-password', { email });
            setSuccess(true);
            setTimeout(() => {
                navigate('/verify-otp', { state: { email } });
            }, 2000);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to request password reset');
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)] px-4">
            <ThemeToggle />
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
                <div className="absolute top-1/4 -right-20 w-80 h-80 bg-blue-600/20 rounded-full blur-[120px]" />
                <div className="absolute bottom-1/4 -left-20 w-80 h-80 bg-indigo-600/20 rounded-full blur-[120px]" />
            </div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md relative z-10">
                <div className="bg-[var(--card-bg)]/80 backdrop-blur-xl border border-[var(--border-color)] p-8 rounded-3xl shadow-2xl">
                    <button onClick={() => navigate('/')} className="flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors mb-6">
                        <ArrowLeft className="w-4 h-4" /> Back to Login
                    </button>

                    <div className="flex justify-center mb-6">
                        <div className="w-16 h-16 bg-blue-500/10 border border-blue-500/20 rounded-2xl flex items-center justify-center text-blue-500">
                            <KeyRound className="w-8 h-8" />
                        </div>
                    </div>

                    <div className="text-center mb-8">
                        <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Forgot Password</h1>
                        <p className="text-[var(--text-secondary)] mt-2 text-sm">Enter your registered email address to receive a 6-digit OTP to securely reset your password.</p>
                    </div>

                    {success ? (
                        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-6 text-center animate-in fade-in zoom-in">
                            <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center mx-auto mb-3">✓</div>
                            <h3 className="text-emerald-400 font-bold">OTP Sent Successfully!</h3>
                            <p className="text-emerald-500/70 text-xs mt-2">Redirecting to verification...</p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Email Address</label>
                                <div className="relative">
                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:border-blue-500 transition-colors text-[var(--text-primary)] text-sm"
                                        placeholder="admin@classbit.com"
                                        required
                                    />
                                </div>
                            </div>

                            {error && (
                                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs text-red-400 font-medium text-center">
                                    {error}
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={loading || !email}
                                className="w-full mt-4 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl font-bold text-white shadow-xl shadow-blue-900/20 transform transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Send OTP via Email'}
                            </button>
                        </form>
                    )}
                </div>
            </motion.div>
        </div>
    );
};

export default ForgotPassword;
