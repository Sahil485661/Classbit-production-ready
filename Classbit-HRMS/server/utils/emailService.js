const dns = require('dns');
// Force IPv4 first to avoid ENETUNREACH errors on IPv6 in restricted environments like Render
dns.setDefaultResultOrder('ipv4first');

const nodemailer = require('nodemailer');
const { EmailTemplate, EmailLog, Setting } = require('../models');

const getTransporter = async () => {
    let smtpConfig = null;

    try {
        const setting = await Setting.findOne({
            where: { key: 'SMTP_CONFIG' }
        });

        if (setting && setting.value) {
            smtpConfig =
                typeof setting.value === 'string'
                    ? JSON.parse(setting.value)
                    : setting.value;
        }
    } catch (err) {
        console.warn(
            'Error fetching SMTP_CONFIG from DB, falling back to ENV:',
            err.message
        );
    }

    const user = smtpConfig?.user || process.env.SMTP_USER;
    const pass = smtpConfig?.pass || process.env.SMTP_PASSWORD;
    const service = smtpConfig?.service || process.env.SMTP_SERVICE || 'gmail';

    return nodemailer.createTransport({
        service,
        auth: {
            user,
            pass
        }
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
        
        let finalSubject = `Notification: ${templateName}`;
        let finalBody = `<p>Message: ${JSON.stringify(variables)}</p>`;
        
        if (template) {
            finalSubject = replaceVariables(template.subject, variables);
            finalBody = replaceVariables(template.htmlBody, variables);
        } else {
            console.warn(`EmailTemplate '${templateName}' not found. Falling back to generic text.`);
        }

        const transporter = await getTransporter();
        

        const mailOptions = {
            from: process.env.SMTP_USER,
            to: recipientEmail,
            subject: finalSubject,
            html: finalBody
        };

        const info = await transporter.sendMail(mailOptions);
        console.log(`Email sent successfully: ${info.messageId}`);

        // Log success
        await EmailLog.create({
            templateName,
            recipientEmail,
            subject: finalSubject,
            status: 'Sent',
            triggeredByObj: triggeredByObj || 'System'
        });

        return true;
    } catch (error) {
        console.error('Failed to send email:', error.message);
        console.error('Stack trace:', error.stack);

        // Log failure
        await EmailLog.create({
            templateName,
            recipientEmail,
            subject: 'Failed to send email',
            status: 'Failed',
            errorMsg: error.message,
            triggeredByObj: triggeredByObj || 'System'
        });

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

/**
 * Initialize default templates if they don't exist
 */
const initDefaultTemplates = async () => {
    try {
        const defaults = [
            {
                name: 'PASSWORD_RESET',
                subject: 'Password Reset OTP - {company_name}',
                htmlBody: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e1e4e8; border-radius: 12px; background-color: #ffffff;">
                        <div style="text-align: center; margin-bottom: 30px;">
                            <h2 style="color: #2c3e50; margin: 0;">Password Reset Request</h2>
                            <p style="color: #7f8c8d; font-size: 14px; margin-top: 5px;">Classbit HRMS Security Service</p>
                        </div>
                        
                        <p style="color: #34495e; line-height: 1.6;">Hello,</p>
                        <p style="color: #34495e; line-height: 1.6;">We received a request to reset your password. Use the following OTP to complete the process:</p>
                        
                        <div style="background: #f8f9fa; border: 2px dashed #3498db; border-radius: 12px; padding: 20px; text-align: center; margin: 25px 0;">
                            <span style="font-family: 'Courier New', monospace; font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #3498db;">{otp}</span>
                        </div>
                        
                        <p style="color: #e74c3c; font-size: 13px; font-weight: bold;">This OTP is valid for 10 minutes only.</p>
                        <p style="color: #7f8c8d; font-size: 13px; line-height: 1.6;">If you didn't request this, you can safely ignore this email. Your password will remain unchanged.</p>
                        
                        <hr style="border: 0; border-top: 1px solid #eee; margin: 30px 0;" />
                        
                        <div style="text-align: center;">
                            <p style="color: #95a5a6; font-size: 12px; margin: 0;">&copy; 2026 {company_name} | <a href="{portal_url}" style="color: #3498db; text-decoration: none;">Visit Portal</a></p>
                        </div>
                    </div>
                `,
                description: 'Sent when a user requests a password reset OTP'
            },
            {
                name: 'LOAN_APPROVAL',
                subject: 'Loan Request Approved - {company_name}',
                htmlBody: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                        <h2>Loan Request Approved</h2>
                        <p>Hello {employee_name},</p>
                        <p>Your loan request for <strong>{amount}</strong> has been approved.</p>
                        <p>It will be deducted over <strong>{installments}</strong> installments.</p>
                        <p>For more details, please visit the portal.</p>
                        <br/>
                        <p>Regards,<br/>{company_name} HR Team</p>
                    </div>
                `,
                description: 'Sent when a loan is approved'
            },
            {
                name: 'LOAN_REJECTION',
                subject: 'Loan Request Rejected - {company_name}',
                htmlBody: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                        <h2>Loan Request Rejected</h2>
                        <p>Hello {employee_name},</p>
                        <p>Unfortunately, your loan request for <strong>{amount}</strong> has been rejected.</p>
                        <p>Please contact HR ({hr_contact}) for more information.</p>
                        <br/>
                        <p>Regards,<br/>{company_name} HR Team</p>
                    </div>
                `,
                description: 'Sent when a loan is rejected'
            },
            {
                name: 'LEAVE_APPROVAL',
                subject: 'Leave Request Approved - {company_name}',
                htmlBody: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                        <h2>Leave Request Approved</h2>
                        <p>Hello {employee_name},</p>
                        <p>Your leave request from <strong>{start_date}</strong> to <strong>{end_date}</strong> has been approved.</p>
                        <p>Enjoy your time off!</p>
                        <br/>
                        <p>Regards,<br/>{company_name} HR Team</p>
                    </div>
                `,
                description: 'Sent when a leave is approved'
            },
            {
                name: 'LEAVE_REJECTION',
                subject: 'Leave Request Rejected - {company_name}',
                htmlBody: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                        <h2>Leave Request Rejected</h2>
                        <p>Hello {employee_name},</p>
                        <p>Your leave request from <strong>{start_date}</strong> to <strong>{end_date}</strong> has been rejected.</p>
                        <p>Reason: {reason}</p>
                        <p>Please contact HR for more information.</p>
                        <br/>
                        <p>Regards,<br/>{company_name} HR Team</p>
                    </div>
                `,
                description: 'Sent when a leave is rejected'
            },
            {
                name: 'REIMBURSEMENT_APPROVAL',
                subject: 'Reimbursement Claim Approved - {company_name}',
                htmlBody: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                        <h2>Reimbursement Approved</h2>
                        <p>Hello {employee_name},</p>
                        <p>Your reimbursement claim of <strong>{amount}</strong> has been approved.</p>
                        <p>It will be credited to your account shortly.</p>
                        <br/>
                        <p>Regards,<br/>{company_name} HR Team</p>
                    </div>
                `,
                description: 'Sent when a reimbursement is approved'
            },
            {
                name: 'REIMBURSEMENT_REJECTION',
                subject: 'Reimbursement Claim Rejected - {company_name}',
                htmlBody: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                        <h2>Reimbursement Rejected</h2>
                        <p>Hello {employee_name},</p>
                        <p>Your reimbursement claim of <strong>{amount}</strong> has been rejected.</p>
                        <p>Reason: {reason}</p>
                        <br/>
                        <p>Regards,<br/>{company_name} HR Team</p>
                    </div>
                `,
                description: 'Sent when a reimbursement is rejected'
            },
            {
                name: 'MEETING_INVITE',
                subject: 'Meeting Invitation: {title} - {company_name}',
                htmlBody: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                        <h2>Meeting Invitation</h2>
                        <p>Hello {employee_name},</p>
                        <p>You have been invited to a meeting: <strong>{title}</strong></p>
                        <p><strong>Date & Time:</strong> {date} at {time}</p>
                        <p><strong>Link/Location:</strong> <a href="{link}">{link}</a></p>
                        <p><strong>Description:</strong> {description}</p>
                        <br/>
                        <p>Please log in to your portal to accept or decline the meeting.</p>
                        <br/>
                        <p>Regards,<br/>{company_name} Team</p>
                    </div>
                `,
                description: 'Sent when an employee is invited to a meeting'
            }
        ];

        for (const t of defaults) {
            await EmailTemplate.findOrCreate({
                where: { name: t.name },
                defaults: t
            });
        }
        console.log('Default email templates initialized.');
    } catch (error) {
        console.error('Failed to initialize default templates:', error.message);
    }
};

module.exports = {
    sendTemplatedEmail,
    sendOtpEmail,
    initDefaultTemplates
};
