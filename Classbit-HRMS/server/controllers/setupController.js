const { Setting, User, Role, Company, AppConfig, sequelize } = require('../models');
const setupTokenService = require('../utils/setupTokenService');
const nodemailer = require('nodemailer');
const { uploadToCloudinary, cloudinary } = require('../config/cloudinary');

const getSetupStatus = async (req, res) => {
    try {
        // Check if admin exists
        const adminRole = await Role.findOne({ where: { name: 'Super Admin' } });
        let adminExists = false;
        if (adminRole) {
            const adminCount = await User.count({ where: { roleId: adminRole.id } });
            if (adminCount > 0) adminExists = true;
        }

        const configCheck = await AppConfig.findOne({ where: { key: 'isSetupComplete' } });
        let isSetupComplete = false;
        
        // Setup is only truly complete if both the config says so AND an admin actually exists
        if (configCheck && configCheck.value === 'true' && adminExists) {
            isSetupComplete = true;
        } else if (adminExists) {
            isSetupComplete = true; // Fallback
        }

        if (isSetupComplete) {
            return res.json({
                isSetupComplete: true,
                setupRequired: false,
                setupTokenRequired: false
            });
        }

        // If no admin exists, generate token (logs to console safely)
        setupTokenService.generateToken();

        res.json({
            isSetupComplete: false,
            setupRequired: true,
            setupTokenRequired: true
        });
    } catch (error) {
        res.status(500).json({ message: 'Error checking setup status', error: error.message });
    }
};

const completeSetup = async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const { companyName, address, contactNumber, name, email, password, setupToken } = req.body;

        let adminRole = await Role.findOne({ where: { name: 'Super Admin' }, transaction });
        let adminExists = false;
        if (adminRole) {
            const adminCount = await User.count({ where: { roleId: adminRole.id }, transaction });
            if (adminCount > 0) adminExists = true;
        }

        // Check if already completed AND admin exists
        const configCheck = await AppConfig.findOne({ where: { key: 'isSetupComplete' }, transaction });
        if (configCheck && configCheck.value === 'true' && adminExists) {
            await transaction.rollback();
            return res.status(400).json({ message: 'Setup is already complete.' });
        }

        if (!setupToken) {
            await transaction.rollback();
            return res.status(400).json({ message: 'Setup token is required.' });
        }

        // Validate token
        if (!setupTokenService.validateToken(setupToken)) {
            await transaction.rollback();
            return res.status(400).json({ message: 'Invalid setup token.' });
        }

        if (!adminRole) {
            adminRole = await Role.create({ 
                name: 'Super Admin', 
                description: 'Full system access' 
            }, { transaction });
        } else if (adminExists) {
            // Check if admin already exists
            await transaction.rollback();
            return res.status(400).json({ message: 'Setup is already complete. Admin exists.' });
        }

        // 1. Create Company
        let logoUrl = null;
        if (req.file) {
            try {
                const cloudResult = await uploadToCloudinary(req.file.buffer, {
                    folder: `hrms/company_logos`,
                    resource_type: 'auto'
                });
                logoUrl = cloudinary.url(cloudResult.public_id, {
                    secure: true,
                    fetch_format: 'auto',
                    quality: 'auto'
                });
            } catch (uploadError) {
                console.error('Cloudinary upload failed for company logo:', uploadError);
            }
        }

        await Company.create({
            name: companyName,
            address: address || null,
            contactNumber: contactNumber || null,
            logoUrl: logoUrl
        }, { transaction });

        // 2. Create the user
        const newAdmin = await User.create({
            email,
            password, // Hook automatically hashes it
            roleId: adminRole.id,
            isActive: true,
            needsPasswordChange: true // Follow the bonus instructions / existing model rule
        }, { transaction });

        // 3. Mark setup complete (upsert to handle if it was left over from a previous setup)
        const [appConfig, created] = await AppConfig.findOrCreate({
            where: { key: 'isSetupComplete' },
            defaults: { value: 'true' },
            transaction
        });
        
        if (!created) {
            await appConfig.update({ value: 'true' }, { transaction });
        }

        // IMPORTANT: Invalidate the token so it cannot be used again
        setupTokenService.invalidateToken();

        await transaction.commit();

        res.status(201).json({ 
            message: 'Setup completed successfully.',
            user: { id: newAdmin.id, email: newAdmin.email }
        });
    } catch (error) {
        await transaction.rollback();
        res.status(500).json({ message: 'Failed to create admin.', error: error.message });
    }
};

const updateSetting = async (req, res) => {
    try {
        const { key, value, category } = req.body;
        const [setting, created] = await Setting.findOrCreate({
            where: { key },
            defaults: { value, category }
        });

        if (!created) {
            await setting.update({ value, category });
        }

        res.json(setting);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getSettings = async (req, res) => {
    try {
        const { category } = req.query;
        const where = category ? { category } : {};
        const settings = await Setting.findAll({ where });
        res.json(settings);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getCompany = async (req, res) => {
    try {
        const company = await Company.findOne();
        res.json(company || { name: 'Classbit Connect', logoUrl: null });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const updateCompany = async (req, res) => {
    try {
        const company = await Company.findOne();
        if (company) {
            await company.update(req.body);
            res.json(company);
        } else {
            const newCompany = await Company.create(req.body);
            res.json(newCompany);
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const sendSetupToken = async (req, res) => {
    try {
        const { email } = req.body;
        
        // 1. Verify we actually need a setup token
        const adminRole = await Role.findOne({ where: { name: 'Super Admin' } });
        let adminExists = false;
        if (adminRole) {
            const adminCount = await User.count({ where: { roleId: adminRole.id } });
            if (adminCount > 0) adminExists = true;
        }

        const configCheck = await AppConfig.findOne({ where: { key: 'isSetupComplete' } });
        let isSetupComplete = false;
        if (configCheck && configCheck.value === 'true' && adminExists) {
            isSetupComplete = true;
        } else if (adminExists) {
            isSetupComplete = true;
        }

        if (isSetupComplete) {
            return res.status(400).json({ message: 'Setup is already complete.' });
        }

        if (!email) {
            return res.status(400).json({ message: 'Email address is required to send token.' });
        }

        // 2. Get the generated token
        const token = setupTokenService.generateToken();

        // 3. Check for SMTP config
        const { SMTP_USER, SMTP_PASSWORD } = process.env;

        if (!SMTP_USER || !SMTP_PASSWORD) {
            // Fallback: No SMTP configured, return token in UI
            console.warn("SMTP not configured. Falling back to UI token delivery.");
            return res.json({ 
                message: 'SMTP not configured. Token auto-filled.', 
                token: token,
                isFallback: true 
            });
        }

        // 4. Send email
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: parseInt(process.env.SMTP_PORT) || 587,
            secure: process.env.SMTP_SECURE === 'true',
            auth: {
                user: SMTP_USER,
                pass: SMTP_PASSWORD
            },
            connectionTimeout: 5000, // 5 seconds
            greetingTimeout: 5000,
            socketTimeout: 10000
        });

        const htmlTemplate = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>HRMS Setup Token</title>
  <style>
    body { font-family: Arial, sans-serif; background-color: #f6f8fa; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 30px auto; background: #ffffff; border: 1px solid #e1e4e8; border-radius: 8px; padding: 20px; }
    h2 { color: #2c3e50; }
    .token-box { background: #f0f4f8; border: 1px dashed #2c3e50; padding: 15px; text-align: center; font-size: 18px; font-weight: bold; letter-spacing: 1px; margin: 20px 0; }
    p { color: #333333; line-height: 1.5; }
    .footer { font-size: 12px; color: #777777; margin-top: 30px; text-align: center; }
  </style>
</head>
<body>
  <div class="container">
    <h2>HRMS System Setup Required</h2>
    <p>Hello,</p>
    <p>Your HRMS system requires initial configuration. Please use the following one‑time Setup Token to create the first Super Admin account:</p>
    <div class="token-box">${token}</div>
    <p>This token is valid for a single use only. Enter it in the Setup Wizard to continue with onboarding.</p>
    <div class="footer">&copy; 2026 HRMS System | Secure Setup Service</div>
  </div>
</body>
</html>`;

        try {
            await transporter.sendMail({
                from: `"HRMS Setup" <${SMTP_USER}>`,
                to: email,
                subject: 'HRMS Secure Setup Token',
                html: htmlTemplate
            });
            return res.json({ message: 'Setup token has been sent to your email.' });
        } catch (mailError) {
            console.error('Failed to send token email:', mailError.message);
            // Fallback: If email fails (wrong password, blocked port), don't block the user.
            // Return the token directly in the response so they can finish setup.
            return res.json({ 
                message: 'Email delivery failed, but we auto-filled your token so you can continue.', 
                token: token,
                isFallback: true 
            });
        }

    } catch (error) {
        console.error('Setup token process error:', error);
        return res.status(500).json({ message: 'Failed to process setup token.', error: error.message });
    }
};

module.exports = { updateSetting, getSettings, getSetupStatus, completeSetup, getCompany, updateCompany, sendSetupToken };
