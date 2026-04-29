import React, { useState } from 'react';
import axios from 'axios';
import {
    FileBarChart, FileText, Download,
    Calendar, TrendingUp, Users, CreditCard,
    CheckCircle
} from 'lucide-react';
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

const ReportsPage = () => {
    const [reportType, setReportType] = useState('attendance');
    const [loadingCSV, setLoadingCSV] = useState(false);
    const [loadingPDF, setLoadingPDF] = useState(false);

    // Helper to protect standard WinAnsi encoding in jsPDF
    const sanitize = (text) => {
        if (text === null || text === undefined) return '';
        return String(text)
            .replace(/[\u20B9]/g, 'Rs. ')     // Replace Rupee
            .replace(/[^\x20-\x7E]/g, '');    // Strip other non-standard ascii bytes
    };

    const fetchReportData = async () => {
        const token = localStorage.getItem('token');
        const res = await axios.get(`/api/reports/${reportType}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        return res.data;
    };

    const handleExportCSV = async () => {
        try {
            setLoadingCSV(true);
            const data = await fetchReportData();
            
            if (!data || data.length === 0) {
                alert('No data available for this report type.');
                return;
            }

            const headers = Object.keys(data[0]);
            const csvRows = [];
            csvRows.push(headers.join(','));

            for (const row of data) {
                const values = headers.map(header => {
                    const val = row[header] === null || row[header] === undefined ? '' : row[header];
                    const escaped = ('' + val).replace(/"/g, '""');
                    return `"${escaped}"`;
                });
                csvRows.push(values.join(','));
            }

            const csvString = csvRows.join('\n');
            const blob = new Blob([csvString], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.setAttribute('hidden', '');
            a.setAttribute('href', url);
            a.setAttribute('download', `${reportType}_report_${new Date().toISOString().split('T')[0]}.csv`);
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
        } catch (error) {
            console.error('Error exporting CSV:', error);
            alert('Failed to generate CSV Report.');
        } finally {
            setLoadingCSV(false);
        }
    };

    const handleExportPDF = async () => {
        try {
            setLoadingPDF(true);
            const data = await fetchReportData();
            
            if (!data || data.length === 0) {
                alert('No data available for this report type.');
                return;
            }

            const doc = new jsPDF({ orientation: 'landscape' });
            const headers = Object.keys(data[0]);
            const rows = data.map(row => headers.map(h => sanitize(row[h])));

            // Add clean Header text
            doc.setFontSize(18);
            doc.setTextColor(40, 40, 40);
            doc.text(`${reportCards.find(r => r.id === reportType)?.name || "System"} Report`, 14, 22);
            doc.setFontSize(10);
            doc.setTextColor(100, 100, 100);
            doc.text(`Generated on: ${new Date().toLocaleString()}`, 14, 30);

            // Execute the tree-shaking safe autoTable invocation
            autoTable(doc, {
                startY: 35,
                head: [headers.map(h => h.replace(/_/g, ' '))],
                body: rows,
                theme: 'grid',
                styles: { fontSize: 8, cellPadding: 3, textColor: [60, 60, 60] },
                headStyles: { fillColor: [59, 130, 246], textColor: [255, 255, 255], fontStyle: 'bold' },
                alternateRowStyles: { fillColor: [249, 250, 251] },
            });

            doc.save(`${reportType}_report_${new Date().toISOString().split('T')[0]}.pdf`);
        } catch (error) {
            console.error('Error exporting PDF:', error);
            alert('Failed to generate PDF Report.');
        } finally {
            setLoadingPDF(false);
        }
    };

    const reportCards = [
        { id: 'attendance', name: 'Attendance Report', desc: 'Analyzes punch-in/out patterns and working hours.', icon: Calendar, color: 'text-blue-500', bg: 'bg-blue-500/10 hover:bg-blue-500 border-blue-500' },
        { id: 'payroll', name: 'Payroll Summary', desc: 'Aggregates disbursements, deductions, and payouts.', icon: CreditCard, color: 'text-emerald-500', bg: 'bg-emerald-500/10 hover:bg-emerald-500 border-emerald-500' },
        { id: 'employees', name: 'Staff Census', desc: 'Company demographics, alignments, and headcount.', icon: Users, color: 'text-amber-500', bg: 'bg-amber-500/10 hover:bg-amber-500 border-amber-500' },
    ];

    return (
        <div className="space-y-6 animate-in fade-in duration-500 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-[var(--text-primary)]">Data Intelligence Reports</h1>
                    <p className="text-[var(--text-secondary)] mt-1">Select a dataset module below to compile and export your business records.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {reportCards.map((report) => {
                    const isActive = reportType === report.id;
                    return (
                        <div
                            key={report.id}
                            onClick={() => setReportType(report.id)}
                            className={`bg-[var(--card-bg)] border p-6 rounded-3xl shadow-lg transition-all cursor-pointer group flex flex-col items-start ${
                                isActive 
                                    ? 'border-blue-500 ring-4 ring-blue-500/10 shadow-blue-500/10 scale-[1.02]' 
                                    : 'border-[var(--border-color)] hover:border-slate-300 hover:shadow-xl hover:-translate-y-1'
                            }`}
                        >
                            <div className="w-full flex justify-between items-start mb-4">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${
                                    isActive 
                                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' 
                                        : `${report.color} ${report.bg.split(' ')[0]} group-hover:bg-[var(--hover-bg)]`
                                }`}>
                                    <report.icon className="w-6 h-6" />
                                </div>
                                {isActive && (
                                    <span className="flex items-center gap-1 text-[10px] font-bold text-blue-600 bg-blue-500/10 px-2 py-1 rounded-lg">
                                        <CheckCircle className="w-3 h-3" /> ACTIVE
                                    </span>
                                )}
                            </div>
                            <h3 className={`text-lg font-bold ${isActive ? 'text-blue-600' : 'text-[var(--text-primary)]'}`}>{report.name}</h3>
                            <p className="text-xs text-[var(--text-secondary)] mt-2 font-medium leading-relaxed">{report.desc}</p>
                        </div>
                    );
                })}
            </div>

            <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-3xl shadow-xl p-6 sm:p-8 transition-colors">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8 pb-6 border-b border-[var(--border-color)]">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-500 border border-indigo-500/20">
                            <FileBarChart className="w-7 h-7" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">
                                Export {reportCards.find(r => r.id === reportType)?.name}
                            </h2>
                            <p className="text-xs text-[var(--text-secondary)] font-medium mt-1">Aggregate and format your internal data structures.</p>
                        </div>
                    </div>
                </div>

                <div className="py-12 text-center space-y-8">
                    <div className="w-24 h-24 bg-[var(--bg-secondary)] rounded-full border-2 border-dashed border-[var(--border-color)] mx-auto flex items-center justify-center relative shadow-sm">
                        <FileText className="w-10 h-10 text-[var(--text-secondary)]" />
                        <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white shadow-lg border-2 border-[var(--card-bg)] fade-in">
                            <CheckCircle className="w-4 h-4" />
                        </div>
                    </div>
                    
                    <div className="max-w-md mx-auto">
                        <h3 className="text-lg font-bold text-[var(--text-primary)]">Ready for Generation</h3>
                        <p className="text-sm text-[var(--text-secondary)] mt-2">
                            The system will dynamically compile the most recent rows from the <b>{reportCards.find(r => r.id === reportType)?.name}</b> module. Select your preferred document format below.
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row justify-center gap-4 pt-4">
                        <button 
                            onClick={handleExportPDF} 
                            disabled={loadingPDF || loadingCSV} 
                            className="flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-500 text-white min-w-[200px] px-8 py-3.5 rounded-xl text-sm font-bold transition-all shadow-lg shadow-rose-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <FileText className="w-5 h-5" />
                            {loadingPDF ? 'Processing Document...' : 'Generate PDF'}
                        </button>

                        <button 
                            onClick={handleExportCSV} 
                            disabled={loadingPDF || loadingCSV} 
                            className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white min-w-[200px] px-8 py-3.5 rounded-xl text-sm font-bold transition-all shadow-lg shadow-blue-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <Download className="w-5 h-5" />
                            {loadingCSV ? 'Fetching Data...' : 'Export CSV Dataset'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReportsPage;
