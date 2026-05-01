const nodemailer = require('nodemailer');
const { EmailTemplate, EmailLog } = require('../models');

const getTransporter = () => {
    return nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASSWORD
        },
        connectionTimeout: 5000,
        greetingTimeout: 5000,
        socketTimeout: 10000
    });
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

        const transporter = getTransporter();
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
