require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const PORT = process.env.PORT || 5000;

if (!fs.existsSync('.env')) {
    // ==========================================
    // SETUP MODE (No .env file found)
    // ==========================================
    console.log("⚠️ No .env file found. Entering Environment Setup Mode.");

    app.get('/api/setup/status', (req, res) => {
        res.json({
            envRequired: true,
            isSetupComplete: false,
            setupRequired: false,
            setupTokenRequired: false
        });
    });

    app.post('/api/setup/env', (req, res) => {
        const { dbHost, dbPort, dbUser, dbPassword, dbName, smtpUser, smtpPassword, nodeEnv } = req.body;
        
        // Auto generate 64-character hex secret
        const JWT_SECRET = crypto.randomBytes(32).toString('hex');
        
        const envContent = `PORT=${PORT}
DB_HOST=${dbHost || 'localhost'}
DB_PORT=${dbPort || '3306'}
DB_USER=${dbUser || 'root'}
DB_PASSWORD=${dbPassword || ''}
DB_NAME=${dbName || 'classbit_hrms'}
JWT_SECRET=${JWT_SECRET}
SMTP_USER=${smtpUser || ''}
SMTP_PASSWORD=${smtpPassword || ''}
NODE_ENV=${nodeEnv || 'development'}
`;

        try {
            fs.writeFileSync('.env', envContent.trim() + '\n');
            res.json({ message: 'Environment configured successfully. Restarting...' });
            
            console.log("🔄 .env file created. Restarting the server...");
            
            // Touch index.js to explicitly force nodemon to restart
            setTimeout(() => {
                const now = new Date();
                fs.utimesSync(__filename, now, now);
            }, 500);
        } catch (error) {
            res.status(500).json({ message: 'Failed to write .env file', error: error.message });
        }
    });

    // Serve frontend in setup mode
    app.use(express.static(path.join(__dirname, '../client/dist')));
    app.get(/.*/, (req, res) => {
        res.sendFile(path.join(__dirname, '../client/dist/index.html'));
    });

    app.listen(PORT, () => {
        console.log(`Setup Server is running on port ${PORT}`);
    });

} else {
    // ==========================================
    // NORMAL MODE (.env exists)
    // ==========================================
    const { connectDB, sequelize } = require('./config/db');
    const models = require('./models');

    // Routes
    app.use('/api/auth', require('./routes/authRoutes'));
    app.use('/api/dashboard', require('./routes/dashboardRoutes'));
    app.use('/api/employees', require('./routes/employeeRoutes'));
    app.use('/api/tasks', require('./routes/taskRoutes'));
    app.use('/api/attendance', require('./routes/attendanceRoutes'));
    app.use('/api/payroll', require('./routes/payrollRoutes'));
    app.use('/api/leave', require('./routes/leaveRoutes'));
    app.use('/api/loan', require('./routes/loanRoutes'));
    app.use('/api/grievance', require('./routes/grievanceRoutes'));
    app.use('/api/accounting', require('./routes/accountingRoutes'));
    app.use('/api/messages', require('./routes/messageRoutes'));
    app.use('/api/notices', require('./routes/noticeRoutes'));
    app.use('/api/notifications', require('./routes/notificationRoutes'));
    app.use('/api/meetings', require('./routes/meetingRoutes'));

    app.use('/api/activities', require('./routes/activityRoutes'));
    app.use('/api/setup/compliance', require('./routes/complianceRoutes'));
    app.use('/api/setup', require('./routes/setupRoutes'));
    app.use('/api/reports', require('./routes/reportRoutes'));
    app.use('/api/salary', require('./routes/salaryRoutes'));
    app.use('/api/reimbursements', require('./routes/reimbursementRoutes'));
    app.use('/api/email-settings', require('./routes/emailSettingsRoutes'));
    app.use('/api/email-actions', require('./routes/emailActionsRoutes'));
    app.use('/api/images', require('./routes/imageRoutes'));

    app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

    // Serve frontend in normal mode
    app.use(express.static(path.join(__dirname, '../client/dist')));
    app.get(/.*/, (req, res) => {
        res.sendFile(path.join(__dirname, '../client/dist/index.html'));
    });

    // Error handling middleware
    app.use((err, req, res, next) => {
        console.error(err.stack);
        res.status(500).json({ message: 'Something went wrong!', error: err.message });
    });

    const startServer = async () => {
        await connectDB();

        // Sync database 
        if (process.env.NODE_ENV === 'development') {
            await sequelize.sync({ alter: true });
            console.log('Database synced');
        }

        const setupTokenService = require('./utils/setupTokenService');
        const { Role, User } = require('./models');
        
        // Check if Setup Token is required on startup
        const adminRole = await Role.findOne({ where: { name: 'Super Admin' } });
        let adminExists = false;
        if (adminRole) {
            const count = await User.count({ where: { roleId: adminRole.id } });
            if (count > 0) adminExists = true;
        }
        if (!adminExists) {
            setupTokenService.generateToken();
        }

        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });
    };

    startServer();
}
