import React, { useState, useEffect, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { logout } from '../slices/authSlice';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import {
    LogOut, Bell, Search, User, X, Mail, Phone,
    Briefcase, Building2, CreditCard, IndianRupee, Shield,
    MapPin, Calendar, Heart, Flag, MessageCircle, ChevronRight,
    TrendingUp, TrendingDown, FileText, Database, Menu
} from 'lucide-react';
import NotificationHub from './NotificationHub';
import { useSidebar } from '../contexts/SidebarContext';

const API = '/api';

// Helper: format Indian currency
const fmt = (n) => n ? `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '—';

// ── Info Row for the panel ────────────────────────
const Row = ({ icon: Icon, label, value, color = 'text-blue-500' }) => (
    value ? (
        <div className="flex items-start gap-3 py-2.5 border-b border-[var(--border-color)] last:border-0">
            <div className={`mt-0.5 shrink-0 ${color}`}><Icon className="w-4 h-4" /></div>
            <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--text-secondary)]">{label}</p>
                <p className="text-sm text-[var(--text-primary)] font-medium mt-0.5 break-words">{value}</p>
            </div>
        </div>
    ) : null
);

// ── Profile Side Panel ────────────────────────────
const ProfilePanel = ({ isOpen, onClose }) => {
    const { user } = useSelector((s) => s.auth);
    const [profile, setProfile]     = useState(null);
    const [loading, setLoading]     = useState(true);

    const token   = localStorage.getItem('token');
    const headers = { Authorization: `Bearer ${token}` };

    useEffect(() => {
        if (!isOpen) return;
        setLoading(true);

        if (user?.employeeId) {
            axios.get(`${API}/employees/${user.employeeId}`, { headers })
                .then((res) => setProfile(res.data))
                .catch((e) => console.error(e))
                .finally(() => setLoading(false));
        } else {
            setLoading(false);
        }
    }, [isOpen]);

    const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" onClick={onClose} />

            {/* Drawer */}
            <div className="fixed top-0 right-0 h-full w-full max-w-[420px] bg-[var(--card-bg)] border-l border-[var(--border-color)] z-50 flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">

                {/* Header */}
                <div className="relative px-6 pt-8 pb-6 bg-slate-900 text-white shrink-0">
                    <button onClick={onClose} className="absolute top-4 right-4 p-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition-colors">
                        <X className="w-4 h-4" />
                    </button>
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-2xl border-2 border-white/30 overflow-hidden shadow-xl shrink-0">
                            {profile?.profilePicture ? (
                                <img src={`/uploads/${profile.profilePicture}`} alt="" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full bg-white/20 flex items-center justify-center text-2xl font-bold">
                                    {user?.firstName?.[0]}{user?.lastName?.[0]}
                                </div>
                            )}
                        </div>
                        <div>
                            <h2 className="text-xl font-extrabold tracking-tight">{user?.firstName} {user?.lastName}</h2>
                            <p className="text-blue-100 text-sm mt-0.5">{profile?.designation || user?.role}</p>
                            <div className="flex items-center gap-2 mt-2">
                                <span className="bg-white/15 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{user?.role}</span>
                                <span className="bg-white/15 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{profile?.employeeId || '—'}</span>
                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${profile?.status === 'Active' ? 'bg-green-400/30 text-green-100' : 'bg-red-400/30 text-red-100'}`}>
                                    {profile?.status || '—'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto px-6 py-4">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-40 gap-3">
                            <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                            <p className="text-sm text-[var(--text-secondary)]">Loading your profile…</p>
                        </div>
                    ) : (
                        <div className="space-y-5">
                            {/* Contact */}
                            <section>
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-[var(--text-secondary)] mb-3 flex items-center gap-2">
                                    <MessageCircle className="w-3.5 h-3.5" /> Contact
                                </h3>
                                <Row icon={Mail}   label="Email"        value={profile?.User?.email} />
                                <Row icon={Phone}  label="Phone"        value={profile?.phone} />
                                <Row icon={Phone}  label="WhatsApp"     value={profile?.whatsappNumber} color="text-green-500" />
                                <Row icon={MapPin} label="Address"      value={profile?.address} color="text-amber-500" />
                            </section>

                            {/* Work */}
                            <section>
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-[var(--text-secondary)] mb-3 flex items-center gap-2">
                                    <Briefcase className="w-3.5 h-3.5" /> Employment
                                </h3>
                                <Row icon={Briefcase}  label="Designation"  value={profile?.designation} />
                                <Row icon={Building2}  label="Department"   value={profile?.Department?.name} color="text-purple-500" />
                                <Row icon={Calendar}   label="Joined"       value={profile?.joiningDate} color="text-teal-500" />
                            </section>

                            {/* Personal */}
                            <section>
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-[var(--text-secondary)] mb-3 flex items-center gap-2">
                                    <User className="w-3.5 h-3.5" /> Personal
                                </h3>
                                <Row icon={Calendar} label="Date of Birth"  value={profile?.dob} color="text-pink-500" />
                                <Row icon={Heart}    label="Marital Status" value={profile?.maritalStatus} color="text-red-500" />
                                <Row icon={Flag}     label="Nationality"    value={profile?.nationality} color="text-orange-500" />
                                <Row icon={FileText} label={`${profile?.identityType || 'Aadhar'} No.`} value={profile?.identityNumber} color="text-slate-400" />
                            </section>

                            {/* Bank */}
                            <section>
                                <h3 className="text-[10px] font-black uppercase tracking-widest text-[var(--text-secondary)] mb-3 flex items-center gap-2">
                                    <CreditCard className="w-3.5 h-3.5" /> Bank Details
                                </h3>
                                <Row icon={Database}  label="Bank Name"        value={profile?.bankName} color="text-indigo-500" />
                                <Row icon={User}      label="Account Holder"   value={profile?.accountHolderName} />
                                <Row icon={CreditCard} label="Account Number"  value={profile?.bankAccountNumber} color="text-blue-400" />
                                <Row icon={FileText}  label="IFSC Code"        value={profile?.bankIfscCode} color="text-cyan-500" />
                                <Row icon={Shield}    label="UPI ID"           value={profile?.upiId} color="text-violet-500" />
                            </section>

                            {/* Emergency */}
                            {(profile?.emergencyContactName || profile?.emergencyContact) && (
                                <section>
                                    <h3 className="text-[10px] font-black uppercase tracking-widest text-[var(--text-secondary)] mb-3 flex items-center gap-2">
                                        <Shield className="w-3.5 h-3.5" /> Emergency Contact
                                    </h3>
                                    <Row icon={User}  label="Name"  value={profile?.emergencyContactName} color="text-red-500" />
                                    <Row icon={Phone} label="Phone" value={profile?.emergencyContact} color="text-red-500" />
                                </section>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-[var(--border-color)] shrink-0 bg-[var(--card-bg)]">
                    <p className="text-[10px] text-[var(--text-secondary)] text-center">
                        Last login: {user?.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'This session'}
                    </p>
                </div>
            </div>
        </>
    );
};

// ── Navbar ────────────────────────────────────────
const Navbar = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { user } = useSelector((state) => state.auth);
    const [profileOpen, setProfileOpen] = useState(false);
    const { setIsMobileOpen } = useSidebar();

    const handleLogout = () => {
        dispatch(logout());
        navigate('/login');
    };

    return (
        <>
            <header className="h-16 bg-[var(--card-bg)] backdrop-blur-md border-b border-[var(--border-color)] flex items-center justify-between md:justify-end px-4 md:px-8 sticky top-0 z-10 transition-colors">
                {/* Mobile Hamburger */}
                <button 
                    onClick={() => setIsMobileOpen(true)}
                    className="p-2 md:hidden text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] rounded-md transition-colors"
                >
                    <Menu className="w-6 h-6" />
                </button>
                
                <div className="flex items-center gap-4 md:gap-6">
                    <NotificationHub />

                    <div className="h-8 w-[1px] bg-[var(--border-color)]" />

                    {/* Profile — clickable */}
                    <button
                        onClick={() => setProfileOpen(true)}
                        className="flex items-center gap-3 group cursor-pointer hover:opacity-90 transition-opacity"
                        title="View My Profile"
                    >
                        <div className="text-right">
                            <p className="text-sm font-semibold text-[var(--text-primary)] group-hover:text-blue-500 transition-colors">{user?.firstName} {user?.lastName}</p>
                            <p className="text-xs text-[var(--text-secondary)]">{user?.role}</p>
                        </div>
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white ring-2 shadow-lg transition-all overflow-hidden ${profileOpen ? 'bg-blue-700 ring-blue-500' : 'bg-slate-700 ring-[var(--border-color)] group-hover:bg-blue-600 group-hover:ring-blue-400'}`}>
                            {user?.profilePicture && user.profilePicture !== 'null' ? (
                                <img src={user.profilePicture.startsWith('http') ? user.profilePicture : `/uploads/${user.profilePicture}`} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                                <User className="w-5 h-5" />
                            )}
                        </div>
                    </button>

                    <button
                        onClick={handleLogout}
                        className="ml-2 p-2 text-[var(--text-muted)] hover:text-red-400 transition-colors"
                        title="Logout"
                    >
                        <LogOut className="w-5 h-5" />
                    </button>
                </div>
            </header>

            <ProfilePanel isOpen={profileOpen} onClose={() => setProfileOpen(false)} />
        </>
    );
};

export default Navbar;
