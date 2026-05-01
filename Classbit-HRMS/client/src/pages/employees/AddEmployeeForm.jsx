import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useSelector } from 'react-redux';
import {
    User, Mail, Lock, Briefcase, Database, UserCheck, Calendar,
    Users, Phone, MapPin, Flag, FileText, Image as ImageIcon, Heart
} from 'lucide-react';

const AddEmployeeForm = ({ onSuccess, onCancel, initialData = null }) => {
    const [formData, setFormData] = useState({
        firstName: initialData?.firstName || '',
        lastName: initialData?.lastName || '',
        email: initialData?.User?.email || '',
        password: '',
        roleId: initialData?.User?.roleId || '',
        employeeId: initialData?.employeeId || '',
        departmentId: initialData?.departmentId || '',
        managerId: initialData?.managerId || '',
        designation: initialData?.designation || '',
        gender: initialData?.gender || 'Male',
        joiningDate: initialData?.joiningDate || new Date().toISOString().split('T')[0],
        fatherName: initialData?.fatherName || '',
        motherName: initialData?.motherName || '',
        identityType: initialData?.identityType || '',
        identityNumber: initialData?.identityNumber || '',
        whatsappNumber: initialData?.whatsappNumber || '',
        linkedinProfile: initialData?.linkedinProfile || '',
        maritalStatus: initialData?.maritalStatus || 'Single',
        emergencyContactName: initialData?.emergencyContactName || '',
        emergencyContact: initialData?.emergencyContact || '',
        nationality: initialData?.nationality || '',
        phone: initialData?.phone || '',
        dob: initialData?.dob || '',
        address: initialData?.address || '',
        bankName: initialData?.bankName || '',
        bankAccountNumber: initialData?.bankAccountNumber || '',
        bankIfscCode: initialData?.bankIfscCode || '',
        accountHolderName: initialData?.accountHolderName || '',
        upiId: initialData?.upiId || '',
        trainingPeriodMonths: initialData?.trainingPeriodMonths !== undefined && initialData?.trainingPeriodMonths !== null ? initialData.trainingPeriodMonths : '',
        probationPeriodMonths: initialData?.probationPeriodMonths !== undefined && initialData?.probationPeriodMonths !== null ? initialData.probationPeriodMonths : ''
    });

    const [profilePicture, setProfilePicture] = useState(null);
    const [roles, setRoles] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [managers, setManagers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState({});

    // Get current user to check role
    const { user } = useSelector(state => state.auth);

    useEffect(() => {
        const fetchData = async () => {
            try {
                const token = localStorage.getItem('token');
                const [rRes, dRes, eRes] = await Promise.all([
                    axios.get('/api/employees/roles', { headers: { Authorization: `Bearer ${token}` } }),
                    axios.get('/api/employees/departments', { headers: { Authorization: `Bearer ${token}` } }),
                    axios.get('/api/employees', { headers: { Authorization: `Bearer ${token}` } })
                ]);
                setRoles(rRes.data);
                setDepartments(dRes.data);
                const activeManagers = eRes.data.filter(emp => emp.status === 'Active' && emp.User?.Role?.name === 'Manager');
                setManagers(activeManagers);
            } catch (err) {
                console.error('Failed to fetch roles/depts', err);
            }
        };
        fetchData();
    }, []);

    const validateField = (name, value, overrideIdType = null) => {
        let error = '';
        if (!value) return '';

        switch (name) {
            case 'firstName':
            case 'lastName':
            case 'accountHolderName':
            case 'bankName':
                if (value.length < 2) error = 'Must be at least 2 characters';
                else if (name !== 'bankName' && !/^[A-Za-z\s]+$/.test(value)) error = 'Only standard letters allowed';
                break;
            case 'email':
                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) error = 'Invalid email address';
                break;
            case 'phone':
            case 'whatsappNumber':
            case 'emergencyContact':
                if (!/^\d{10}$/.test(value)) error = 'Must be exactly 10 digits';
                break;
            case 'linkedinProfile':
                if (!/^(https?:\/\/)?([\w]+\.)?linkedin\.com\/.*$/.test(value)) error = 'Must be a valid LinkedIn URL';
                break;
            case 'dob':
                const age = new Date().getFullYear() - new Date(value).getFullYear();
                if (age < 18) error = 'Employee must be at least 18 years old';
                break;
            case 'identityNumber':
                const idType = overrideIdType || formData.identityType;
                if (idType === 'Aadhar' && !/^\d{12}$/.test(value)) error = 'Aadhar must be exactly 12 digits';
                else if (idType === 'PAN' && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/i.test(value)) error = 'Invalid PAN format';
                break;
            case 'bankAccountNumber':
                if (!/^\d{9,18}$/.test(value)) error = 'Account number must be 9-18 digits';
                break;
            case 'bankIfscCode':
                if (!/^[A-Z]{4}0[A-Z0-9]{6}$/i.test(value)) error = 'Invalid IFSC Code format';
                break;
            case 'upiId':
                if (!/^[\w.-]+@[\w.-]+$/.test(value)) error = 'Invalid UPI ID format';
                break;
            default:
                break;
        }
        return error;
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        
        const error = validateField(name, value);
        setErrors(prev => ({ ...prev, [name]: error }));

        if (name === 'identityType') {
            const idErr = validateField('identityNumber', formData.identityNumber, value);
            setErrors(prev => ({ ...prev, identityNumber: idErr }));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        let initialErrors = {};
        Object.keys(formData).forEach(key => {
            const err = validateField(key, formData[key]);
            if (err) initialErrors[key] = err;
        });

        if (!formData.identityType || !formData.identityNumber) {
            initialErrors.identityType = formData.identityType ? '' : 'Identity Type is required';
            initialErrors.identityNumber = formData.identityNumber ? '' : 'Identity Number is required';
        }

        const activeErrors = Object.values(initialErrors).filter(val => val !== '');
        if (activeErrors.length > 0) {
            setErrors(initialErrors);
            alert('Please fix the validation errors before submitting.');
            return;
        }

        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const url = initialData
                ? `/api/employees/${initialData.id}`
                : '/api/employees';
            const method = initialData ? 'put' : 'post';

            const payload = new FormData();
            
            Object.keys(formData).forEach(key => {
                if (initialData && key === 'password' && !formData.password) return;
                if (!initialData && key === 'password' && !formData.password) {
                    payload.append('password', 'password123');
                    return;
                }
                
                if (formData[key] !== null && formData[key] !== undefined) {
                    payload.append(key, formData[key]);
                }
            });

            if (profilePicture) {
                payload.append('profilePicture', profilePicture);
            }

            await axios[method](url, payload, {
                headers: { 
                    Authorization: `Bearer ${token}`
                }
            });
            onSuccess();
        } catch (err) {
            let errorMsg = err.response?.data?.message || 'Failed to save employee';
            if (err.response?.data?.details) {
                errorMsg += ':\n\n• ' + err.response.data.details.join('\n• ');
            }
            alert(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    const inputClass = "w-full bg-[var(--bg-secondary)] border rounded-xl py-2.5 px-4 text-[var(--text-primary)] focus:outline-none focus:ring-2 transition-all text-sm";
    const labelClass = "text-xs font-bold text-[var(--text-secondary)] uppercase tracking-widest mb-1.5 block ml-1 mt-4";
    const sectionTitleClass = "text-sm font-bold text-blue-500 uppercase tracking-wider mt-6 mb-2 border-b border-[var(--border-color)] pb-2";
    const iconClass = "absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)]";

    const renderInput = (name, type, placeholder, Icon, required = false, isSelect = false, options = []) => {
        const hasError = errors[name];
        const baseClass = `${inputClass} ${Icon ? 'pl-10' : ''} ${hasError ? 'border-red-500 focus:ring-red-500/50' : 'border-[var(--border-color)] focus:ring-blue-500/50'}`;
        
        return (
            <div className="flex flex-col">
                <div className="relative">
                    {Icon && <Icon className={iconClass} />}
                    {isSelect ? (
                        <select
                            name={name}
                            required={required}
                            className={`${baseClass} appearance-none`}
                            value={formData[name]}
                            onChange={handleChange}
                        >
                            {options}
                        </select>
                    ) : (
                        <input
                            type={type}
                            name={name}
                            required={required}
                            placeholder={placeholder}
                            className={baseClass}
                            value={formData[name]}
                            onChange={handleChange}
                        />
                    )}
                </div>
                {hasError && <p className="text-red-500 text-[10px] sm:text-xs font-semibold mt-1.5 ml-1">{hasError}</p>}
            </div>
        );
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            
            <h3 className={sectionTitleClass}>Basic Information</h3>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className={labelClass}>First Name</label>
                    {renderInput('firstName', 'text', 'John', User, true)}
                </div>
                <div>
                    <label className={labelClass}>Last Name</label>
                    {renderInput('lastName', 'text', 'Doe', null, true)}
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className={labelClass}>Email Address</label>
                    {renderInput('email', 'email', 'john@company.com', Mail, true)}
                </div>
                <div>
                    <label className={labelClass}>Phone Number</label>
                    {renderInput('phone', 'text', '10-digit number', Phone, true)}
                </div>
            </div>

            {user?.role === 'Super Admin' && (
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className={labelClass}>
                            Password <span className="text-slate-400 font-normal lowercase">(For portal access)</span>
                        </label>
                        {renderInput('password', 'text', initialData ? '(Leave blank to keep current)' : 'Default is password123', Lock, false)}
                    </div>
                </div>
            )}

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className={labelClass}>Gender</label>
                    {renderInput('gender', 'text', '', null, false, true, [
                        <option key="Male" value="Male">Male</option>,
                        <option key="Female" value="Female">Female</option>,
                        <option key="Other" value="Other">Other</option>
                     ])}
                </div>
                <div>
                    <label className={labelClass}>Date of Birth</label>
                    {renderInput('dob', 'date', '', Calendar, true)}
                </div>
            </div>

            <h3 className={sectionTitleClass}>Employment Details</h3>
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className={labelClass}>Employee ID</label>
                    {renderInput('employeeId', 'text', 'e.g. EMP101', Database, true)}
                </div>
                <div>
                    <label className={labelClass}>Joining Date</label>
                    {renderInput('joiningDate', 'date', '', Calendar, true)}
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className={labelClass}>Department</label>
                    {renderInput('departmentId', 'text', '', Briefcase, true, true, [
                        <option key="default" value="">Select Dept</option>,
                        ...departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)
                    ])}
                </div>
                <div>
                    <label className={labelClass}>Role</label>
                    {renderInput('roleId', 'text', '', UserCheck, true, true, [
                        <option key="default" value="">Select Role</option>,
                        ...roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)
                    ])}
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className={labelClass}>Reporting Manager</label>
                    {renderInput('managerId', 'text', '', UserCheck, false, true, [
                        <option key="default" value="">Select Manager (None)</option>,
                        ...managers.map(m => <option key={m.id} value={m.id}>{m.firstName} {m.lastName}</option>)
                    ])}
                </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
                <div>
                    <label className={labelClass}>Designation</label>
                    {renderInput('designation', 'text', 'e.g. Software Engineer', null, true)}
                </div>
                <div>
                    <label className={labelClass}>Training (Months)</label>
                    {renderInput('trainingPeriodMonths', 'number', '0')}
                </div>
                <div>
                    <label className={labelClass}>Probation (Months)</label>
                    {renderInput('probationPeriodMonths', 'number', '0')}
                </div>
            </div>

            <h3 className={sectionTitleClass}>Personal & Identity Details</h3>
            
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className={labelClass}>Father's Name</label>
                    {renderInput('fatherName', 'text', '', Users)}
                </div>
                <div>
                    <label className={labelClass}>Mother's Name</label>
                    {renderInput('motherName', 'text', '', Users)}
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className={labelClass}>Identity Type <span className="text-red-500">*</span></label>
                    {renderInput('identityType', 'text', '', FileText, true, true, [
                        <option key="default" value="">Select Identity Type</option>,
                        <option key="Aadhar" value="Aadhar">Aadhar</option>,
                        <option key="PAN" value="PAN">PAN</option>,
                        <option key="Voter ID" value="Voter ID">Voter ID</option>,
                        <option key="Driving License" value="Driving License">Driving License</option>
                    ])}
                </div>
                <div>
                    <label className={labelClass}>Identity Number <span className="text-red-500">*</span></label>
                    {renderInput('identityNumber', 'text', 'e.g. Aadhar / PAN', FileText, true)}
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className={labelClass}>Marital Status</label>
                    {renderInput('maritalStatus', 'text', '', Heart, false, true, [
                        <option key="Single" value="Single">Single</option>,
                        <option key="Married" value="Married">Married</option>,
                        <option key="Divorced" value="Divorced">Divorced</option>,
                        <option key="Widowed" value="Widowed">Widowed</option>
                    ])}
                </div>
                <div>
                    <label className={labelClass}>Nationality</label>
                    {renderInput('nationality', 'text', 'e.g. Indian', Flag)}
                </div>
            </div>

            <div>
                <label className={labelClass}>Passport Size Photo <span className="text-slate-400 font-normal lowercase">(Max 500KB)</span></label>
                <div className="relative flex flex-col">
                    <div className="relative">
                        <ImageIcon className={iconClass} />
                        <input 
                            type="file" 
                            accept="image/*"
                            onChange={(e) => {
                                const file = e.target.files[0];
                                if (file && file.size > 500 * 1024) {
                                    setErrors(prev => ({ ...prev, profilePicture: 'Image size must be less than 500KB' }));
                                    setProfilePicture(null);
                                    e.target.value = '';
                                } else {
                                    setErrors(prev => ({ ...prev, profilePicture: '' }));
                                    setProfilePicture(file);
                                }
                            }} 
                            className={`w-full bg-[var(--bg-secondary)] border ${errors.profilePicture ? 'border-red-500 focus:ring-red-500/50' : 'border-[var(--border-color)] focus:ring-blue-500/50'} rounded-xl py-2.5 pl-10 pr-4 text-[var(--text-primary)] focus:outline-none focus:ring-2 transition-all text-sm file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-500 file:text-white hover:file:bg-blue-600 file:cursor-pointer pb-[9px]`} 
                        />
                    </div>
                    {errors.profilePicture && <p className="text-red-500 text-[10px] sm:text-xs font-semibold mt-1.5 ml-1">{errors.profilePicture}</p>}
                </div>
            </div>

            <h3 className={sectionTitleClass}>Salary & Bank Details</h3>
            
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className={labelClass}>Bank Name <span className="text-red-500">*</span></label>
                    {renderInput('bankName', 'text', 'e.g. HDFC Bank', Briefcase, true)}
                </div>
                <div>
                    <label className={labelClass}>Account Holder Name <span className="text-red-500">*</span></label>
                    {renderInput('accountHolderName', 'text', 'Name exactly as per bank', User, true)}
                </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className={labelClass}>Account Number <span className="text-red-500">*</span></label>
                    {renderInput('bankAccountNumber', 'text', '9-18 digit account no.', Database, true)}
                </div>
                <div>
                    <label className={labelClass}>IFSC Code <span className="text-red-500">*</span></label>
                    {renderInput('bankIfscCode', 'text', 'e.g. HDFC0001234', FileText, true)}
                </div>
            </div>

            <div>
                <label className={labelClass}>UPI ID <span className="text-slate-400 font-normal lowercase">(Optional)</span></label>
                {renderInput('upiId', 'text', 'e.g. username@bank', Phone)}
            </div>

            <h3 className={sectionTitleClass}>Additional Contact & Address</h3>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className={labelClass}>WhatsApp Number</label>
                    {renderInput('whatsappNumber', 'text', '10-digit number', Phone)}
                </div>
                <div>
                    <label className={labelClass}>LinkedIn Profile</label>
                    {renderInput('linkedinProfile', 'text', 'URL (Optional)', User)}
                </div>
            </div>

            <div>
                <label className={labelClass}>Full Address</label>
                <div className="relative">
                    <MapPin className="absolute left-3 top-3 w-4 h-4 text-[var(--text-secondary)]" />
                    <textarea 
                        name="address"
                        required 
                        className={`w-full bg-[var(--bg-secondary)] border ${errors.address ? 'border-red-500 focus:ring-red-500/50' : 'border-[var(--border-color)] focus:ring-blue-500/50'} rounded-xl py-2.5 pl-10 pr-4 text-[var(--text-primary)] focus:outline-none focus:ring-2 transition-all text-sm min-h-[80px]`} 
                        value={formData.address} 
                        onChange={handleChange} 
                    />
                    {errors.address && <p className="text-red-500 text-xs mt-1 ml-1">{errors.address}</p>}
                </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
                <div>
                    <label className={labelClass}>Emergency Contact Name</label>
                    {renderInput('emergencyContactName', 'text', '', User, true)}
                </div>
                <div>
                    <label className={labelClass}>Emergency Contact Phone</label>
                    {renderInput('emergencyContact', 'text', '10-digit number', Phone, true)}
                </div>
            </div>

            <div className="flex justify-end gap-3 mt-8 pt-4 border-t border-[var(--border-color)]">
                <button
                    type="button"
                    onClick={onCancel}
                    className="px-6 py-2.5 rounded-xl border border-[var(--border-color)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] transition-all font-semibold"
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={loading}
                    className="px-8 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold transition-all shadow-lg shadow-blue-900/20 flex items-center gap-2"
                >
                    {loading && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                    {loading ? 'Saving...' : (initialData ? 'Update Employee' : 'Create Employee')}
                </button>
            </div>
        </form>
    );
};

export default AddEmployeeForm;
