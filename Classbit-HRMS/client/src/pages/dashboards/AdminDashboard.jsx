import React, { useState, useEffect } from 'react';
import axios from 'axios';
import EventCalendar from '../../components/EventCalendar';
import NoticeboardWidget from '../../components/NoticeboardWidget';
import {
    Users, FileText, Briefcase, AlertCircle,
    Search, CreditCard, ShoppingCart, TrendingUp
} from 'lucide-react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer
} from 'recharts';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useNavigate } from 'react-router-dom';

const AdminDashboard = () => {
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [recentTasks, setRecentTasks] = useState([]);
    const [loading, setLoading] = useState(true);

    const iconMap = {
        'Employees': Users,
        'Grievances': AlertCircle,
        'Job Seekers': Search,
        'Active Work': Briefcase,
        'Total Expenses': TrendingUp
    };

    const colorMap = {
        'Employees': 'text-blue-400',
        'Grievances': 'text-red-400',
        'Job Seekers': 'text-teal-400',
        'Active Work': 'text-orange-400',
        'Total Expenses': 'text-green-400'
    };

    const bgMap = {
        'Employees': 'bg-blue-400/10',
        'Grievances': 'bg-red-400/10',
        'Job Seekers': 'bg-teal-400/10',
        'Active Work': 'bg-orange-400/10',
        'Total Expenses': 'bg-green-400/10'
    };

    useEffect(() => {
        const fetchDashboardData = async () => {
            setLoading(true);
            try {
                const token = localStorage.getItem('token');
                if (!token) return;
                const headers = { Authorization: `Bearer ${token}` };

                // Fetch individually
                try {
                    const statsRes = await axios.get('/api/dashboard/stats', { headers });
                    setData(statsRes.data);
                } catch (e) {
                    console.error('Stats fetch failed:', e);
                }

                try {
                    const tasksRes = await axios.get('/api/tasks/my', { headers });
                    setRecentTasks(Array.isArray(tasksRes.data) ? tasksRes.data : []);
                } catch (e) {
                    console.error('Recent tasks fetch failed:', e);
                    setRecentTasks([]);
                }

            } catch (error) {
                console.error('Error in fetchDashboardData:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchDashboardData();
    }, []);

    if (loading) return <div className="p-8 text-slate-400 italic">Synchronizing system data...</div>;

    const handleGenerateReport = () => {
        const doc = new jsPDF();

        // 1. Header
        doc.setFontSize(22);
        doc.setTextColor(40);
        doc.text("Executive System Report", 14, 22);
        
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Generated on: ${new Date().toLocaleString('en-IN')}`, 14, 30);
        doc.text("Classbit HRMS - Corporate Analytical Data", 14, 35);
        
        let targetY = 45;

        // Helper to strip multi-byte Unicode chars (₹ and hidden spaces) for jsPDF standard fonts
        const sanitize = (text) => {
            if (!text) return '';
            return String(text)
                .replace(/₹/g, 'Rs. ')
                .replace(/[^\x20-\x7E]/g, ' ')
                .replace(/\s+/g, ' ')
                .trim();
        };

        // 2. High-Level Metrics
        if (data?.summary) {
            doc.setFontSize(14);
            doc.setTextColor(0);
            doc.text("Master Aggregates", 14, targetY);
            
            const statsData = data.summary.map(s => [sanitize(s.name), sanitize(s.value)]);
            
            autoTable(doc, {
                startY: targetY + 5,
                head: [['Metric Classification', 'Active Value']],
                body: statsData,
                theme: 'striped',
                headStyles: { fillColor: [59, 130, 246] }, // Tailwind blue-500
                styles: { fontSize: 10 }
            });
            targetY = doc.lastAutoTable.finalY + 15;
        }

        // 3. Demographics
        if (data?.genderDistribution) {
            if (targetY > 250) { doc.addPage(); targetY = 20; }
            doc.setFontSize(14);
            doc.setTextColor(0);
            doc.text("Enterprise Demographics", 14, targetY);
            
            const genderData = data.genderDistribution.map(g => [sanitize(g.name), sanitize(g.value)]);
            
            autoTable(doc, {
                startY: targetY + 5,
                head: [['Demographic Segment', 'Headcount']],
                body: genderData,
                theme: 'striped',
                headStyles: { fillColor: [16, 185, 129] }, // Tailwind emerald-500
                styles: { fontSize: 10 }
            });
            targetY = doc.lastAutoTable.finalY + 15;
        }

        // 4. Assignments
        if (recentTasks && recentTasks.length > 0) {
            if (targetY > 250) { doc.addPage(); targetY = 20; }
            doc.setFontSize(14);
            doc.setTextColor(0);
            doc.text("Active Work Assignments", 14, targetY);
            
            const taskData = recentTasks.map(t => [
                sanitize(t.title),
                sanitize(t.priority),
                sanitize(t.status),
                sanitize(new Date(t.deadline).toLocaleDateString())
            ]);
            
            autoTable(doc, {
                startY: targetY + 5,
                head: [['Task Title', 'Priority', 'Status', 'Deadline']],
                body: taskData,
                theme: 'striped',
                headStyles: { fillColor: [249, 115, 22] }, // Tailwind orange-500
                styles: { fontSize: 10 }
            });
        }

        doc.save(`System_Executive_Report_${new Date().toISOString().split('T')[0]}.pdf`);
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            <div className="flex justify-between items-center text-left">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text-primary)]">System Overview</h1>
                    <p className="text-[var(--text-secondary)] mt-1">Real-time HRMS analytics and reporting.</p>
                </div>
                <button 
                    onClick={handleGenerateReport}
                    className="flex justify-center flex-row items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-lg shadow-blue-900/20 active:scale-95"
                >
                    <FileText className="w-4 h-4" />
                    Generate PDF Report
                </button>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {data?.summary?.map((stat) => (
                    <div key={stat.name} className="bg-[var(--card-bg)] shadow-xl border border-[var(--border-color)] p-5 rounded-2xl hover:border-blue-500/30 transition-all group">
                        <div className="flex justify-between items-start">
                            <div className="text-left">
                                <p className="text-[var(--text-secondary)] text-[10px] font-bold uppercase tracking-wider">{stat.name}</p>
                                <h3 className="text-xl font-bold text-[var(--text-primary)] mt-1">{stat.value}</h3>
                            </div>
                            <div className={`${bgMap[stat.name] || 'bg-[var(--bg-secondary)]'} p-2.5 rounded-xl group-hover:scale-110 transition-transform`}>
                                {iconMap[stat.name] ? React.createElement(iconMap[stat.name], { className: `w-5 h-5 ${colorMap[stat.name] || 'text-slate-400'}` }) : <Briefcase className="w-5 h-5" />}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="w-full">
                {/* Attendance Chart */}
                <div className="w-full bg-[var(--card-bg)] border border-[var(--border-color)] p-6 rounded-2xl shadow-xl transition-colors">
                    <h3 className="text-sm font-bold text-[var(--text-secondary)] mb-6 uppercase tracking-widest text-left">Internal Attendance Trend</h3>
                    <div className="h-80 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                                data={data?.attendanceTrend || []}
                                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" vertical={false} opacity={0.5} />
                                <XAxis dataKey="name" stroke="var(--text-secondary)" fontSize={11} tickLine={false} axisLine={false} tick={{ dy: 10 }} />
                                <YAxis stroke="var(--text-secondary)" fontSize={11} tickLine={false} axisLine={false} />
                                <Tooltip
                                    cursor={{ fill: 'var(--hover-bg)', opacity: 0.1 }}
                                    contentStyle={{ backgroundColor: 'var(--card-bg)', border: '1px solid var(--border-color)', borderRadius: '12px', fontSize: '12px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                                    itemStyle={{ color: 'var(--text-primary)' }}
                                />
                                <Bar dataKey="present" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={24} />
                                <Bar dataKey="absent" fill="#ef4444" radius={[4, 4, 0, 0]} barSize={24} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Recent Tasks Table & Notices */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-2xl shadow-xl overflow-hidden transition-colors h-full flex flex-col">
                        <div className="p-6 border-b border-[var(--border-color)] flex justify-between items-center">
                            <h3 className="text-sm font-bold text-[var(--text-secondary)] uppercase tracking-widest italic">Active Work Assignments</h3>
                            <span className="text-[10px] bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded-full font-bold">LIVE UPDATES</span>
                        </div>
                        <div className="overflow-x-auto flex-1">
                    <table className="w-full text-left order-collapse">
                        <thead>
                            <tr className="bg-[var(--bg-secondary)]/30 text-[var(--text-secondary)] text-[10px] uppercase tracking-widest">
                                <th className="px-6 py-4">Task Title</th>
                                <th className="px-6 py-4">Priority</th>
                                <th className="px-6 py-4">Assigned To</th>
                                <th className="px-6 py-4">Deadline</th>
                                <th className="px-6 py-4">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[var(--border-color)]">
                            {recentTasks.length === 0 ? (
                                <tr><td colSpan="5" className="px-6 py-12 text-center text-slate-500 italic">No recent assignments found.</td></tr>
                            ) : (
                                recentTasks.map((task) => (
                                    <tr key={task.id} className="hover:bg-slate-800/10 transition-colors cursor-pointer" onClick={() => navigate(`/work/tasks/${task.id}`)}>
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-bold text-[var(--text-primary)]">{task.title}</div>
                                            <div className="text-[10px] text-[var(--text-secondary)] line-clamp-1">{task.description}</div>
                                            <div className="text-[9px] text-blue-400 font-bold mt-1">
                                                By: {task.Creator?.Employee ? `${task.Creator.Employee.firstName} ${task.Creator.Employee.lastName}` : (task.Creator?.email || 'Admin')}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${task.priority === 'High' || task.priority === 'Urgent' ? 'bg-red-500/10 text-red-500' : 'bg-blue-500/10 text-blue-500'
                                                }`}>
                                                {task.priority}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex -space-x-2">
                                                {task.TaskAssignments?.slice(0, 3).map((asg, i) => (
                                                    <div key={i} title={`${asg.Employee?.firstName || 'User'} (${asg.Employee?.employeeId || 'NA'})`} className="w-7 h-7 rounded-full bg-blue-600 border-2 border-[var(--card-bg)] flex items-center justify-center text-[8px] font-bold text-white uppercase">
                                                        {asg.Employee?.firstName?.[0] || '?'}
                                                    </div>
                                                ))}
                                                {task.TaskAssignments?.length > 3 && (
                                                    <div className="w-7 h-7 rounded-full bg-slate-700 border-2 border-[var(--card-bg)] flex items-center justify-center text-[8px] font-bold text-slate-400">
                                                        +{task.TaskAssignments.length - 3}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-xs text-[var(--text-secondary)] italic">
                                            {new Date(task.deadline).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all ${task.status === 'Completed' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-orange-500/10 text-orange-500 border-orange-500/20'
                                                }`}>
                                                {task.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            </div>
            <div className="lg:col-span-1 space-y-6">
                <NoticeboardWidget />
            </div>
        </div>

        {/* Scheduling & Agenda Framework */}
            <div className="pt-4">
                <h3 className="text-xl font-bold text-[var(--text-primary)] mb-6 tracking-tight">System Week Calendar</h3>
                <EventCalendar viewMode="week" />
            </div>

        </div>
    );
};

export default AdminDashboard;
