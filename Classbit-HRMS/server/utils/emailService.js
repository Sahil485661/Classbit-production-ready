const nodemailer = require('nodemailer');
const { EmailTemplate, EmailLog, Setting } = require('../models');

const getTransporter = async () => {
    // Try to get SMTP config from database settings first
    let smtpConfig = null;
    try {
        const setting = await Setting.findOne({ where: { key: 'SMTP_CONFIG' } });
        if (setting && setting.value) {
            smtpConfig = typeof setting.value === 'string' ? JSON.parse(setting.value) : setting.value;
        }
    } catch (err) {
        console.warn('Error fetching SMTP_CONFIG from DB, falling back to ENV:', err.message);
    }

    const host = smtpConfig?.host || process.env.SMTP_HOST || 'smtp.gmail.com';
    const port = parseInt(smtpConfig?.port || process.env.SMTP_PORT) || 587;
    const user = smtpConfig?.user || process.env.SMTP_USER;
    const pass = smtpConfig?.pass || process.env.SMTP_PASSWORD;
    const service = smtpConfig?.service || process.env.SMTP_SERVICE;
    
    // Auto-detect secure based on port if not explicitly set
    let secure = false;
    if (smtpConfig && smtpConfig.secure !== undefined) {
        secure = smtpConfig.secure === true || smtpConfig.secure === 'true';
    } else if (process.env.SMTP_SECURE !== undefined) {
        secure = process.env.SMTP_SECURE === 'true';
    } else if (port === 465) {
        secure = true;
    }

    const config = {
        auth: { user, pass },
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 15000,
        tls: {
            rejectUnauthorized: false
        },
        debug: process.env.NODE_ENV === 'development',
        logger: process.env.NODE_ENV === 'development'
    };

    if (service && service !== 'custom') {
        config.service = service;
    } else {
        config.host = host;
        config.port = port;
        config.secure = secure;
    }

    return nodemailer.createTransport(config);
};

/**
 * Replace placeholders in text like {employee_name} with actual values
 */
const replaceVariables = (text, variables) => {
    if (!text) return '';
    let result = text;
    for (const [key, value] of Object.entries(variables || {})) {
        const regex = new RegExp(`{${key}}`, 'g');
        result = result.replace(regex, value);
    }
    return result;
};

/**
 * Core function to send templated emails
 */
const sendTemplatedEmail = async (templateName, recipientEmail, variables, triggeredByObj = 'System') => {
    try {
        if (!recipientEmail) {
            console.error('sendTemplatedEmail: Recipient email is missing');
            return false;
        }

        const template = await EmailTemplate.findOne({ where: { name: templateName } });
        
        let subject = `Notification: ${templateName}`;
        let htmlBody = `<p>Message: ${JSON.stringify(variables)}</p>`;
        
        if (template) {
            subject = replaceVariables(template.subject, variables);
            htmlBody = replaceVariables(template.htmlBody, variables);
        } else {
            console.warn(`EmailTemplate '${templateName}' not found. Falling back to generic text.`);
        }

        const transporter = await getTransporter();
        const mailOptions = {
            from: process.env.SMTP_USER,
            to: recipientEmail,
            subject: subject,
            html: htmlBody
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`Email sent [${templateName}]: ` + info.response);

        // Record log
        await EmailLog.create({
            templateName,
            recipientEmail,
            subject,
            status: 'Sent',
            triggeredByObj
        });

        return true;
    } catch (error) {
        console.error(`Error sending email [${templateName}]:`, error);
        
        // Record failed log
        try {
            await EmailLog.create({
                templateName,
                recipientEmail,
                subject: `Attempted: ${templateName}`,
                status: 'Failed',
                errorMsg: error.message,
                triggeredByObj
            });
        } catch (logErr) {}

        return false;
    }
};

/**
 * Convenience wrapper for OTP backward compatibility 
 */
const sendOtpEmail = async (email, otp) => {
    return sendTemplatedEmail('PASSWORD_RESET', email, { 
        otp, 
        company_name: 'Classbit HRMS',
        portal_url: process.env.FRONTEND_URL || 'https://classbit-production-ready.onrender.com'
    }, 'System-Auth');
};

module.exports = {
    sendTemplatedEmail,
    sendOtpEmail
};
