import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { Provider, useSelector, useDispatch } from 'react-redux';
import { store } from './store';
import Navbar from './components/Navbar';
import { SessionNavBar } from './components/ui/sidebar';
import { SidebarProvider } from './contexts/SidebarContext';
import { logout } from './slices/authSlice';
import {
    LayoutDashboard, Users, Clock, Briefcase,
    CreditCard, Calendar, BarChart3, Landmark,
    MessageSquare, Settings, UserCog, ClipboardList,
    AlertCircle, TrendingUp, UserPlus, History, Receipt,
    ChevronDown, ChevronRight, Bell, Video
} from 'lucide-react';
import Login from './pages/Login';
import SetupAdmin from './pages/setup/SetupAdmin';
import EnvironmentSetup from './pages/setup/EnvironmentSetup';
import CalendarPage from './pages/calendar/CalendarPage';
import ForceChangePassword from './pages/ForceChangePassword';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Dashboard from './pages/Dashboard';
import EmployeeList from './pages/employees/EmployeeList';
import EmployeeHistory from './pages/employees/EmployeeHistory';
import AddEmployeePage from './pages/employees/AddEmployeePage';
import EmployeeDetailsPage from './pages/employees/EmployeeDetailsPage';
import AttendancePage from './pages/attendance/AttendancePage';
import TaskBoard from './pages/work/TaskBoard';
import TaskDetailsPage from './pages/work/TaskDetailsPage';
import PayrollPage from './pages/payroll/PayrollPage';
import LeaveManagement from './pages/leave/LeaveManagement';
import SettingsPage from './pages/setup/SettingsPage';
import NoticeManagement from './pages/setup/NoticeManagement';
import LoanPage from './pages/loan/LoanPage';
import GrievancePage from './pages/grievance/GrievancePage';
import MessagesPage from './pages/messages/MessagesPage';
import AccountingPage from './pages/accounting/AccountingPage';
import ReportsPage from './pages/reports/ReportsPage';
import ActivitiesPage from './pages/activities/ActivitiesPage';
import ReimbursementPage from './pages/reimbursements/ReimbursementPage';
import MeetingsPage from './pages/meetings/MeetingsPage';


class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
    this.setState({ errorInfo });
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', color: 'red', background: 'white' }}>
          <h2>Something went wrong in the UI.</h2>
          <details style={{ whiteSpace: 'pre-wrap' }}>
            {this.state.error && this.state.error.toString()}
            <br />
            {this.state.errorInfo && this.state.errorInfo.componentStack}
          </details>
          <button onClick={() => window.location.href='/employees'}>Go Back</button>
        </div>
      );
    }
    return this.props.children;
  }
}

const PrivateRoute = ({ children, roles, permissionKey }) => {
  const { user, token } = useSelector((state) => state.auth);

  if (!token) return <Navigate to="/login" />;
  
  if (user.role === 'Super Admin') return <ErrorBoundary>{children}</ErrorBoundary>;

  const perms = user.permissions;

  // Fallback to legacy role checks if permissions are unassigned or undefined
  if (perms === undefined || perms.length === 0) {
      if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" />;
      return <ErrorBoundary>{children}</ErrorBoundary>;
  }

  if (permissionKey) {
      if (!perms.includes(permissionKey)) return <Navigate to="/dashboard" />;
  } else if (roles && !roles.includes(user.role)) {
      return <Navigate to="/dashboard" />;
  }

  return <ErrorBoundary>{children}</ErrorBoundary>;
};

const AppLayout = ({ children }) => {
  const { token, user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const [company, setCompany] = useState({ name: 'Classbit Connect', logo: '/logo.png' });

  useEffect(() => {
      const fetchCompany = async () => {
          try {
              const res = await axios.get('/api/setup/company');
              setCompany({
                  name: res.data.name || 'Classbit Connect',
                  logo: res.data.logoUrl ? `/uploads/${res.data.logoUrl}` : '/logo.png'
              });
          } catch (err) {
              console.error('Failed to load company details', err);
          }
      };
      fetchCompany();
  }, []);

  if (!token) return <Navigate to="/login" />;

  const role = user?.role;
  const permissions = user?.permissions;

  const menuItems = [
      { name: 'Dashboard', icon: LayoutDashboard, path: '/dashboard', roles: ['Super Admin', 'HR', 'Manager', 'Employee'], permissionKey: 'Dashboard' },
      { name: 'Notice Board', icon: Bell, path: '/notices', roles: ['Super Admin', 'HR', 'Manager', 'Employee'] },
      { name: 'Calendar', icon: Calendar, path: '/calendar', roles: ['Super Admin', 'HR', 'Manager', 'Employee'] },
      { name: 'Employees', icon: Users, path: '/employees', roles: ['Super Admin', 'HR', 'Manager'], permissionKey: 'Employees' },
      { 
          name: 'Attendance', 
          icon: Clock, 
          path: '#',
          roles: ['Super Admin', 'HR', 'Manager', 'Employee'], 
          permissionKey: 'Attendance',
          subItems: [
              { name: 'Attendance Log', path: '/attendance' },
              { name: 'Leave', path: '/leave' }
          ]
      },
      { name: 'Work', icon: Briefcase, path: '/work', roles: ['Super Admin', 'HR', 'Manager', 'Employee'], permissionKey: 'Tasks' },
      { name: 'Payroll', icon: CreditCard, path: '/payroll', roles: ['Super Admin', 'HR', 'Employee'], permissionKey: 'Payroll' },
      { name: 'Reimbursements', icon: Receipt, path: '/reimbursements', roles: ['Super Admin', 'HR', 'Manager', 'Employee'], permissionKey: 'Reimbursements' },
      { name: 'Loan', icon: Landmark, path: '/loan', disabled: role !== 'Super Admin', roles: ['Super Admin', 'HR', 'Manager', 'Employee'], permissionKey: 'Loans' },
      { name: 'Grievance', icon: AlertCircle, path: '/grievance', roles: ['Super Admin', 'HR', 'Manager', 'Employee'], permissionKey: 'Grievances' },
      { name: 'Meetings', icon: Video, path: '/meetings', roles: ['Super Admin', 'HR', 'Manager', 'Employee'] },
      { name: 'Accounting', icon: BarChart3, path: '/accounting', roles: ['Super Admin'] },
      { name: 'Messages', icon: MessageSquare, path: '/messages', roles: ['Super Admin', 'HR', 'Manager', 'Employee'], permissionKey: 'Messages' },
      { name: 'Managers', icon: UserCog, path: '/managers', roles: ['Super Admin'] },
      { name: 'Reports', icon: ClipboardList, path: '/reports', roles: ['Super Admin', 'HR'] },
      { name: 'Setup', icon: Settings, path: '/setup', roles: ['Super Admin', 'HR'], permissionKey: 'Settings' },
      { name: 'Activities', icon: History, path: '/activities', roles: ['Super Admin'] },
  ];

  const filteredItems = menuItems.filter(item => {
      if (role === 'Super Admin' && item.roles.includes('Super Admin')) return true;
      if (permissions === undefined || permissions.length === 0) return item.roles.includes(role);
      if (item.permissionKey) return permissions.includes(item.permissionKey);
      return item.roles.includes(role);
  });

  const navItems = filteredItems.map(item => ({
      label: item.name,
      icon: <item.icon className="w-4 h-4" />,
      href: item.path,
      disabled: item.disabled,
      subItems: item.subItems ? item.subItems.map(subItem => ({
          label: subItem.name,
          href: subItem.path
      })) : undefined
  }));

  const userContext = {
      name: `${user?.firstName} ${user?.lastName}`,
      email: user?.email,
      role: user?.role,
      avatar: user?.profilePicture && user.profilePicture !== 'null' 
          ? (user.profilePicture.startsWith('http') ? user.profilePicture : `/uploads/${user.profilePicture}`) 
          : null
  };

  const onLogout = () => {
      dispatch(logout());
      window.location.href = '/login';
  };

  return (
    <SidebarProvider>
      <div className="flex h-screen bg-[var(--bg-primary)] text-[var(--text-primary)] overflow-hidden transition-colors duration-300">
        <SessionNavBar 
            organization={company}
            userContext={userContext}
            navItems={navItems}
            onLogout={onLogout}
        />
        <div className="flex flex-col flex-1 min-w-0 overflow-hidden relative">
          <Navbar />
          <main className="flex-1 overflow-y-auto p-6 bg-[var(--bg-secondary)] backdrop-blur-sm z-0 relative">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

const SetupGuard = ({ children }) => {
  const [status, setStatus] = useState({ loading: true, setupRequired: false });
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
      const checkSetup = async () => {
          try {
              // Append timestamp to prevent aggressive browser caching of the setup status
              const response = await axios.get(`/api/setup/status?t=${new Date().getTime()}`);
              if (response.data.envRequired) {
                  setStatus({ loading: false, setupRequired: true, envRequired: true });
              } else if (response.data.setupRequired) {
                  setStatus({ loading: false, setupRequired: true, envRequired: false });
              } else {
                  setStatus({ loading: false, setupRequired: false, envRequired: false });
              }
          } catch (err) {
              console.error("Setup check failed", err);
              // If we cannot reach the backend, display an error instead of redirecting to login
              setStatus({ loading: false, error: true });
          }
      };
      
      checkSetup();
  }, [location.pathname, navigate]);

  if (status.loading) {
      return (
          <div className="flex justify-center items-center h-screen bg-[var(--bg-primary)]">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
      );
  }

  if (status.error) {
      return (
          <div className="flex flex-col justify-center items-center h-screen bg-[var(--bg-primary)] text-center p-6">
              <div className="text-red-500 mb-4">
                  <AlertCircle className="w-16 h-16 mx-auto mb-4" />
              </div>
              <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-2">Backend Server Unreachable</h1>
              <p className="text-[var(--text-secondary)] mb-6 max-w-md">
                  We couldn't connect to the backend server. It may have crashed due to invalid database credentials in your .env file, or it's currently restarting.
              </p>
              <button 
                  onClick={() => window.location.reload()}
                  className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg font-medium transition-colors"
              >
                  Retry Connection
              </button>
          </div>
      );
  }

  // If env setup is required and we aren't on /setup-env, redirect securely
  if (status.envRequired && location.pathname !== '/setup-env') {
      return <Navigate to="/setup-env" replace />;
  }

  // If setup is required and we aren't on /setup-admin, redirect securely
  if (status.setupRequired && !status.envRequired && location.pathname !== '/setup-admin') {
      return <Navigate to="/setup-admin" replace />;
  }

  // If setup is completely done but user tries to access setup pages, send them to login
  if (!status.setupRequired && !status.envRequired && (location.pathname === '/setup-env' || location.pathname === '/setup-admin')) {
      return <Navigate to="/login" replace />;
  }

  return children;
};

function App() {
  return (
    <Provider store={store}>
      <Router>
        <SetupGuard>
          <Routes>
          <Route path="/setup-env" element={<EnvironmentSetup />} />
          <Route path="/setup-admin" element={<SetupAdmin />} />
          <Route path="/login" element={<Login />} />
          <Route path="/force-change-password" element={<ForceChangePassword />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/verify-otp" element={<ResetPassword />} />

          <Route path="/" element={<Navigate to="/dashboard" />} />

          <Route path="/dashboard" element={
            <PrivateRoute>
              <AppLayout><Dashboard /></AppLayout>
            </PrivateRoute>
          } />

          <Route path="/calendar" element={
            <PrivateRoute>
              <AppLayout><CalendarPage /></AppLayout>
            </PrivateRoute>
          } />

          <Route path="/notices" element={
            <PrivateRoute>
              <AppLayout><NoticeManagement /></AppLayout>
            </PrivateRoute>
          } />

          <Route path="/employees" element={
            <PrivateRoute permissionKey="Employees">
              <AppLayout><EmployeeList /></AppLayout>
            </PrivateRoute>
          } />

          <Route path="/employees/history" element={
            <PrivateRoute permissionKey="Employees">
              <AppLayout><EmployeeHistory /></AppLayout>
            </PrivateRoute>
          } />

          <Route path="/employees/:id" element={
            <PrivateRoute permissionKey="Employees">
              <AppLayout><EmployeeDetailsPage /></AppLayout>
            </PrivateRoute>
          } />

          <Route path="/employees/add" element={
            <PrivateRoute permissionKey="Employees">
              <AppLayout><AddEmployeePage /></AppLayout>
            </PrivateRoute>
          } />

          <Route path="/employees/edit/:id" element={
            <PrivateRoute permissionKey="Employees">
              <AppLayout><AddEmployeePage /></AppLayout>
            </PrivateRoute>
          } />

          <Route path="/attendance" element={
            <PrivateRoute permissionKey="Attendance">
              <AppLayout><AttendancePage /></AppLayout>
            </PrivateRoute>
          } />

          <Route path="/work" element={
            <PrivateRoute permissionKey="Tasks">
              <AppLayout><TaskBoard /></AppLayout>
            </PrivateRoute>
          } />

          <Route path="/work/tasks/:id" element={
            <PrivateRoute permissionKey="Tasks">
              <AppLayout><TaskDetailsPage /></AppLayout>
            </PrivateRoute>
          } />

          <Route path="/payroll" element={
            <PrivateRoute permissionKey="Payroll">
              <AppLayout><PayrollPage /></AppLayout>
            </PrivateRoute>
          } />

          <Route path="/leave" element={
            <PrivateRoute permissionKey="Leaves">
              <AppLayout><LeaveManagement /></AppLayout>
            </PrivateRoute>
          } />

          <Route path="/setup" element={
            <PrivateRoute permissionKey="Settings">
              <AppLayout><SettingsPage /></AppLayout>
            </PrivateRoute>
          } />

          <Route path="/loan" element={
            <PrivateRoute permissionKey="Loans">
              <AppLayout><LoanPage /></AppLayout>
            </PrivateRoute>
          } />

          <Route path="/grievance" element={
            <PrivateRoute permissionKey="Grievances">
              <AppLayout><GrievancePage /></AppLayout>
            </PrivateRoute>
          } />

          <Route path="/messages" element={
            <PrivateRoute permissionKey="Messages">
              <AppLayout><MessagesPage /></AppLayout>
            </PrivateRoute>
          } />

          <Route path="/reimbursements" element={
            <PrivateRoute permissionKey="Reimbursements">
              <AppLayout><ReimbursementPage /></AppLayout>
            </PrivateRoute>
          } />

          <Route path="/accounting" element={
            <PrivateRoute permissionKey="Accounting">
              <AppLayout><AccountingPage /></AppLayout>
            </PrivateRoute>
          } />

          <Route path="/reports" element={
            <PrivateRoute roles={['Super Admin', 'HR']}>
              <AppLayout><ReportsPage /></AppLayout>
            </PrivateRoute>
          } />

          <Route path="/activities" element={
            <PrivateRoute roles={['Super Admin']}>
              <AppLayout><ActivitiesPage /></AppLayout>
            </PrivateRoute>
          } />

          <Route path="/managers" element={
            <PrivateRoute roles={['Super Admin']}>
              <AppLayout><EmployeeList title="Management Hierarchy" /></AppLayout>
            </PrivateRoute>
          } />

          <Route path="/meetings" element={
            <PrivateRoute roles={['Super Admin', 'HR', 'Manager', 'Employee']}>
              <AppLayout><MeetingsPage /></AppLayout>
            </PrivateRoute>
          } />


        </Routes>
        </SetupGuard>
      </Router>
    </Provider>
  );
}

export default App;
