import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import AddEmployeeForm from './AddEmployeeForm';
import { ArrowLeft } from 'lucide-react';

const AddEmployeePage = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { id } = useParams();
    
    const [initialData, setInitialData] = useState(location.state?.employee || null);
    const [loading, setLoading] = useState(!!id && !location.state?.employee);

    useEffect(() => {
        if (id && !location.state?.employee) {
            const fetchEmployee = async () => {
                try {
                    const token = localStorage.getItem('token');
                    const res = await axios.get(`/api/employees/${id}`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    setInitialData(res.data);
                } catch (error) {
                    console.error('Failed to fetch employee', error);
                } finally {
                    setLoading(false);
                }
            };
            fetchEmployee();
        }
    }, [id, location.state]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="mt-4 text-[var(--text-secondary)] font-medium">Loading Employee Data...</p>
            </div>
        );
    }

    return (
        <div className="font-sans">
            <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-500">
                <div className="flex flex-col gap-2">
                    <button 
                        onClick={() => navigate('/employees')}
                        className="flex items-center gap-2 text-blue-500 hover:text-blue-400 font-semibold w-fit transition-colors"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Directory
                    </button>
                    <div>
                        <h1 className="text-3xl font-extrabold text-[var(--text-primary)] tracking-tight">
                            {initialData ? 'Edit Employee Details' : 'Add New Employee'}
                        </h1>
                        <p className="text-[var(--text-secondary)] mt-2 text-sm max-w-2xl">
                            {initialData ? 'Update the information for this employee below. Ensure all compulsory fields are correctly populated.' : 'Fill out the form below to onboard a new employee to the directory. Make sure all compulsory identity and contact fields are completed.'}
                        </p>
                    </div>
                </div>

                <div className="bg-[var(--card-bg)] border border-[var(--border-color)] rounded-3xl shadow-xl overflow-hidden">
                    <div className="p-8">
                        <AddEmployeeForm 
                            initialData={initialData}
                            onSuccess={() => navigate('/employees')}
                            onCancel={() => navigate('/employees')}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AddEmployeePage;
