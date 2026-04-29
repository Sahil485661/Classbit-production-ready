import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Mail, User, KeyRound, Loader2, Building, MapPin, Phone, UploadCloud, ChevronRight, ChevronLeft } from 'lucide-react';
import ThemeToggle from '../../components/ThemeToggle';
import axios from 'axios';

const SetupAdmin = () => {
    const [step, setStep] = useState(1);

    // Company Data
    const [companyName, setCompanyName] = useState('');
    const [address, setAddress] = useState('');
    const [contactNumber, setContactNumber] = useState('');
    const [logo, setLogo] = useState(null);

    // Admin Data
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [setupToken, setSetupToken] = useState('');

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [sendingToken, setSendingToken] = useState(false);
    const [tokenMessage, setTokenMessage] = useState('');
    const navigate = useNavigate();

    const handleSendToken = async () => {
        if (!email) {
            setError("Please enter an email address to receive the token.");
            return;
        }
        
        setSendingToken(true);
        setError(null);
        setTokenMessage('');

        try {
            const response = await axios.post('/api/setup/send-token', { email });
            
            if (response.data.isFallback) {
                setSetupToken(response.data.token);
                setTokenMessage("SMTP not configured. Token auto-filled.");
            } else {
                setTokenMessage("Setup token sent to your email!");
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to send setup token');
        } finally {
            setSendingToken(false);
        }
    };

    const handleNext = (e) => {
        e.preventDefault();
        // Basic validation for Step 1
        if (!companyName) {
            setError("Company name is required.");
            return;
        }
        setError(null);
        setStep(2);
    };

    const handleBack = () => {
        setError(null);
        setStep(1);
    };

    const handleLogoChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setLogo(e.target.files[0]);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        
        try {
            const formData = new FormData();
            formData.append('companyName', companyName);
            formData.append('address', address);
            formData.append('contactNumber', contactNumber);
            if (logo) {
                formData.append('logo', logo);
            }
            formData.append('name', name);
            formData.append('email', email);
            formData.append('password', password);
            formData.append('setupToken', setupToken);

            const response = await axios.post('/api/setup/complete', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });
            
            if (response.status === 201) {
                navigate('/login');
            }
        } catch (err) {
            setError(err.response?.data?.message || err.message || 'Setup failed');
        } finally {
            setLoading(false);
        }
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
                <div className="bg-[var(--card-bg)]/80 backdrop-blur-xl border border-[var(--border-color)] p-8 rounded-2xl shadow-2xl overflow-hidden">
                    <div className="text-center mb-8">
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                            System Setup
                        </h1>
                        <p className="text-[var(--text-secondary)] mt-2">
                            {step === 1 ? 'Step 1: Organization Details' : 'Step 2: Admin Account'}
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

                    <form onSubmit={step === 1 ? handleNext : handleSubmit} className="space-y-6 relative min-h-[300px]">
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
                                    <div>
                                        <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Company Name *</label>
                                        <div className="relative">
                                            <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
                                            <input
                                                type="text"
                                                value={companyName}
                                                onChange={(e) => setCompanyName(e.target.value)}
                                                className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg py-3 pl-11 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all text-[var(--text-primary)]"
                                                placeholder="Classbit Inc."
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Address</label>
                                        <div className="relative">
                                            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
                                            <input
                                                type="text"
                                                value={address}
                                                onChange={(e) => setAddress(e.target.value)}
                                                className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg py-3 pl-11 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all text-[var(--text-primary)]"
                                                placeholder="123 Tech Lane"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Contact Number</label>
                                        <div className="relative">
                                            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
                                            <input
                                                type="text"
                                                value={contactNumber}
                                                onChange={(e) => setContactNumber(e.target.value)}
                                                className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg py-3 pl-11 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all text-[var(--text-primary)]"
                                                placeholder="+1 234 567 890"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Company Logo</label>
                                        <div className="relative">
                                            <UploadCloud className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
                                            <input
                                                type="file"
                                                accept="image/*"
                                                onChange={handleLogoChange}
                                                className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg py-2 pl-11 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all text-[var(--text-secondary)] file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                                            />
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
                                    <div>
                                        <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Full Name *</label>
                                        <div className="relative">
                                            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
                                            <input
                                                type="text"
                                                value={name}
                                                onChange={(e) => setName(e.target.value)}
                                                className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg py-3 pl-11 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all text-[var(--text-primary)]"
                                                placeholder="Admin User"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Email Address *</label>
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
                                        <label className="block text-sm font-medium text-[var(--text-primary)] mb-2">Password *</label>
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

                                    <div>
                                        <div className="flex justify-between items-center mb-2">
                                            <label className="block text-sm font-medium text-[var(--text-primary)]">Setup Token *</label>
                                            <button 
                                                type="button" 
                                                onClick={handleSendToken}
                                                disabled={sendingToken}
                                                className="text-xs text-blue-500 hover:text-blue-600 font-semibold disabled:opacity-50 transition-colors"
                                            >
                                                {sendingToken ? 'Sending...' : 'Get Setup Token'}
                                            </button>
                                        </div>
                                        <div className="relative">
                                            <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--text-muted)]" />
                                            <input
                                                type="text"
                                                value={setupToken}
                                                onChange={(e) => setSetupToken(e.target.value)}
                                                className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg py-3 pl-11 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all text-[var(--text-primary)]"
                                                placeholder="Enter server-generated code"
                                                required
                                            />
                                        </div>
                                        {tokenMessage && (
                                            <p className="text-emerald-500 text-xs mt-2 font-medium">{tokenMessage}</p>
                                        )}
                                    </div>

                                    <div className="flex gap-4 mt-6">
                                        <button
                                            type="button"
                                            onClick={handleBack}
                                            className="w-1/3 bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-primary)] hover:bg-[var(--hover-bg)] px-4 py-3 rounded-xl font-semibold transition-all flex items-center justify-center"
                                        >
                                            <ChevronLeft className="w-5 h-5" /> Back
                                        </button>
                                        <button
                                            type="submit"
                                            disabled={loading}
                                            className="w-2/3 bg-blue-600 hover:bg-blue-500 text-white px-4 py-3 rounded-xl font-semibold shadow-lg shadow-blue-900/20 transform transition-all active:scale-[0.98] disabled:opacity-70 flex items-center justify-center gap-2"
                                        >
                                            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Complete Setup'}
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

export default SetupAdmin;
