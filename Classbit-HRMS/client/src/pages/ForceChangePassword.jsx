import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Lock, Loader2, ShieldAlert } from 'lucide-react';
import { login } from '../slices/authSlice';
import ThemeToggle from '../components/ThemeToggle';

const ForceChangePassword = () => {
    const { tempEmail } = useSelector((state) => state.auth);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const navigate = useNavigate();
    const dispatch = useDispatch();

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
            await axios.post('/api/auth/first-login-change', {
                email: tempEmail,
                password: currentPassword,
                newPassword: newPassword
            });
            
            // Re-login
            const result = await dispatch(login({ email: tempEmail, password: newPassword }));
            if (!result.error) {
                navigate('/dashboard');
            } else {
                navigate('/');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to change password');
            setLoading(false);
        }
    };

    if (!tempEmail) {
        navigate('/');
        return null;
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-[var(--bg-primary)] px-4 py-10">
            <ThemeToggle />
            {/* Background blobs */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
                <div className="absolute top-1/4 -left-20 w-80 h-80 bg-red-600/20 rounded-full blur-[120px]" />
                <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-orange-600/20 rounded-full blur-[120px]" />
            </div>

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-md relative z-10"
            >
                <div className="bg-[var(--card-bg)]/80 backdrop-blur-xl border border-[var(--border-color)] p-8 rounded-3xl shadow-2xl">
                    <div className="flex justify-center mb-6">
                        <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center text-red-500">
                            <ShieldAlert className="w-8 h-8" />
                        </div>
                    </div>
                    <div className="text-center mb-8">
                        <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Security Action Required</h1>
                        <p className="text-[var(--text-secondary)] mt-2 text-sm">For your security, you must change your initial password before accessing the system.</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Current/Temp Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                                <input
                                    type="password"
                                    value={currentPassword}
                                    onChange={(e) => setCurrentPassword(e.target.value)}
                                    className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:border-blue-500 transition-colors text-[var(--text-primary)] text-sm"
                                    placeholder="Enter the password you just used"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">New Secure Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                                <input
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:border-blue-500 transition-colors text-[var(--text-primary)] text-sm"
                                    placeholder="Enter new password"
                                    required
                                />
                            </div>
                            
                            {/* Security Checklist visually showing progress */}
                            <div className="mt-3 grid grid-cols-2 gap-2 text-[10px] font-semibold text-slate-400">
                                <div className={`flex items-center gap-1.5 ${isLengthValid ? 'text-emerald-400' : ''}`}>
                                    <div className={`w-1.5 h-1.5 rounded-full ${isLengthValid ? 'bg-emerald-400' : 'bg-slate-700'}`}></div> 8+ Characters
                                </div>
                                <div className={`flex items-center gap-1.5 ${hasUpper ? 'text-emerald-400' : ''}`}>
                                    <div className={`w-1.5 h-1.5 rounded-full ${hasUpper ? 'bg-emerald-400' : 'bg-slate-700'}`}></div> 1 Uppercase
                                </div>
                                <div className={`flex items-center gap-1.5 ${hasNumber ? 'text-emerald-400' : ''}`}>
                                    <div className={`w-1.5 h-1.5 rounded-full ${hasNumber ? 'bg-emerald-400' : 'bg-slate-700'}`}></div> 1 Number
                                </div>
                                <div className={`flex items-center gap-1.5 ${hasSpecial ? 'text-emerald-400' : ''}`}>
                                    <div className={`w-1.5 h-1.5 rounded-full ${hasSpecial ? 'bg-emerald-400' : 'bg-slate-700'}`}></div> 1 Special Char
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Confirm New Password</label>
                            <div className="relative">
                                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-muted)]" />
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl py-3 pl-10 pr-4 focus:outline-none focus:border-blue-500 transition-colors text-[var(--text-primary)] text-sm"
                                    placeholder="Re-enter new password"
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
                            disabled={loading || !newPassword || !confirmPassword || !currentPassword}
                            className="w-full mt-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 py-3.5 rounded-xl font-bold text-white shadow-xl shadow-blue-900/20 transform transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Set Secure Password & Login'}
                        </button>
                    </form>
                </div>
            </motion.div>
        </div>
    );
};

export default ForceChangePassword;
