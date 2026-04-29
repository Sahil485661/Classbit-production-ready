import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import { KeyRound, Loader2, ArrowLeft, Lock, ShieldCheck } from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';

const ResetPassword = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const email = location.state?.email || '';

    const [otp, setOtp] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        if (!email) {
            navigate('/forgot-password');
        }
    }, [email, navigate]);

    // Password criteria validation
    const isLengthValid = newPassword.length >= 8;
    const hasUpper = /[A-Z]/.test(newPassword);
    const hasLower = /[a-z]/.test(newPassword);
    const hasNumber = /\d/.test(newPassword);
    const hasSpecial = /[@$!%*?&]/.test(newPassword);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            return setError('Passwords do not match');
        }
        if (!isLengthValid || !hasUpper || !hasLower || !hasNumber || !hasSpecial) {
            return setError('Password does not meet the specified security criteria.');
        }

        setLoading(true);
        setError(null);
        try {
            await axios.post('/api/auth/reset-password', {
                email,
                otp,
                newPassword
            });
            setSuccess(true);
            setTimeout(() => {
                navigate('/');
            }, 3000);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to verify OTP or reset password');
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)] px-4 py-10">
            <ThemeToggle />
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
                <div className="absolute top-1/4 -right-20 w-80 h-80 bg-emerald-600/20 rounded-full blur-[120px]" />
                <div className="absolute bottom-1/4 -left-20 w-80 h-80 bg-teal-600/20 rounded-full blur-[120px]" />
            </div>

            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md relative z-10">
                <div className="bg-[var(--card-bg)]/80 backdrop-blur-xl border border-[var(--border-color)] p-8 rounded-3xl shadow-2xl">
                    <button onClick={() => navigate('/forgot-password')} className="flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors mb-6">
                        <ArrowLeft className="w-4 h-4" /> Back
                    </button>
                    
                    <div className="flex justify-center mb-6">
                        <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center justify-center text-emerald-500">
                            <ShieldCheck className="w-8 h-8" />
                        </div>
                    </div>
                    
                    <div className="text-center mb-8">
                        <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Verify & Reset</h1>
                        <p className="text-[var(--text-secondary)] mt-2 text-sm">Enter the 6-digit OTP sent to <span className="text-emerald-400 font-semibold">{email}</span></p>
                    </div>

                    {success ? (
                        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-6 text-center animate-in fade-in zoom-in">
                            <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center mx-auto mb-3">✓</div>
                            <h3 className="text-emerald-400 font-bold">Password Reset Successful!</h3>
                            <p className="text-emerald-500/70 text-sm mt-2">You can now securely log in with your new password.</p>
                            <p className="text-emerald-500/50 text-xs mt-4">Redirecting...</p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase tracking-wider mb-2 text-center">6-Digit Secure OTP</label>
                                <input
                                    type="text"
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, '').substring(0, 6))}
                                    className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl py-4 text-center text-2xl font-mono tracking-[0.5em] focus:outline-none focus:border-emerald-500 transition-colors text-[var(--text-primary)]"
                                    placeholder="••••••"
                                    required
                                />
                            </div>

                            <div className="pt-2">
                                <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">New Password</label>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                                    <input
                                        type="password"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:border-emerald-500 transition-colors text-[var(--text-primary)] text-sm"
                                        placeholder="Enter new password"
                                        required
                                    />
                                </div>
                                
                                <div className="mt-3 grid grid-cols-2 gap-2 text-[10px] font-semibold text-slate-400 px-1">
                                    <div className={`flex items-center gap-1.5 ${isLengthValid ? 'text-emerald-400' : ''}`}>
                                        <div className={`w-1.5 h-1.5 rounded-full ${isLengthValid ? 'bg-emerald-400' : 'bg-slate-700'}`}></div> 8+ Chars
                                    </div>
                                    <div className={`flex items-center gap-1.5 ${hasUpper ? 'text-emerald-400' : ''}`}>
                                        <div className={`w-1.5 h-1.5 rounded-full ${hasUpper ? 'bg-emerald-400' : 'bg-slate-700'}`}></div> 1 Upper
                                    </div>
                                    <div className={`flex items-center gap-1.5 ${hasNumber ? 'text-emerald-400' : ''}`}>
                                        <div className={`w-1.5 h-1.5 rounded-full ${hasNumber ? 'bg-emerald-400' : 'bg-slate-700'}`}></div> 1 Number
                                    </div>
                                    <div className={`flex items-center gap-1.5 ${hasSpecial ? 'text-emerald-400' : ''}`}>
                                        <div className={`w-1.5 h-1.5 rounded-full ${hasSpecial ? 'bg-emerald-400' : 'bg-slate-700'}`}></div> 1 Special (@$!%*?&)
                                    </div>
                                </div>
                            </div>

                            <div>
                                <div className="relative">
                                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                                    <input
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:border-emerald-500 transition-colors text-[var(--text-primary)] text-sm"
                                        placeholder="Confirm new password"
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
                                disabled={loading || otp.length !== 6 || !newPassword || !confirmPassword}
                                className="w-full mt-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 py-3.5 rounded-xl font-bold text-white shadow-xl shadow-emerald-900/20 transform transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Reset Password'}
                            </button>
                        </form>
                    )}
                </div>
            </motion.div>
        </div>
    );
};

export default ResetPassword;
