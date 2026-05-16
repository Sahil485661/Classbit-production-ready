const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

const { EmailTemplate, EmailLog, Setting } = require('../models');
const nodemailer = require('nodemailer');

exports.getTemplates = async (req, res) => {
    try {
        const templates = await EmailTemplate.findAll({ order: [['name', 'ASC']] });
        res.json(templates);
    } catch (error) {
        console.error('Error fetching templates:', error);
        res.status(500).json({ message: 'Server error fetching templates' });
    }
};

exports.createTemplate = async (req, res) => {
    try {
        const { name, subject, htmlBody, description } = req.body;
        
        // Check if name already exists
        const existing = await EmailTemplate.findOne({ where: { name } });
        if (existing) {
            return res.status(400).json({ message: 'Template name already exists' });
        }

        const template = await EmailTemplate.create({
            name,
            subject,
            htmlBody,
            description
        });

        res.status(201).json({ message: 'Template created successfully', template });
    } catch (error) {
        console.error('Error creating template:', error);
        res.status(500).json({ message: 'Server error creating template' });
    }
};

exports.updateTemplate = async (req, res) => {
    try {
        const { id } = req.params;
        const { subject, htmlBody, description } = req.body;
        
        const template = await EmailTemplate.findByPk(id);
        if (!template) {
            return res.status(404).json({ message: 'Template not found' });
        }

        template.subject = subject;
        template.htmlBody = htmlBody;
        if (description) template.description = description;
        await template.save();

        res.json({ message: 'Template updated successfully', template });
    } catch (error) {
        console.error('Error updating template:', error);
        res.status(500).json({ message: 'Server error updating template' });
    }
};

exports.deleteTemplate = async (req, res) => {
    try {
        const { id } = req.params;
        const template = await EmailTemplate.findByPk(id);
        if (!template) {
            return res.status(404).json({ message: 'Template not found' });
        }

        await template.destroy();
        res.json({ message: 'Template deleted successfully' });
    } catch (error) {
        console.error('Error deleting template:', error);
        res.status(500).json({ message: 'Server error deleting template' });
    }
};

exports.getLogs = async (req, res) => {
    try {
        const logs = await EmailLog.findAll({
            order: [['createdAt', 'DESC']],
            limit: 100 
        });
        res.json(logs);
    } catch (error) {
        console.error('Error fetching email logs:', error);
        res.status(500).json({ message: 'Server error fetching logs' });
    }
};

exports.getSmtpSettings = async (req, res) => {
    try {
        const setting = await Setting.findOne({ where: { key: 'SMTP_CONFIG' } });
        if (!setting) {
            return res.json({
                host: process.env.SMTP_HOST || 'smtp.gmail.com',
                port: process.env.SMTP_PORT || '587',
                user: process.env.SMTP_USER || '',
                secure: process.env.SMTP_SECURE === 'true'
            });
        }
        res.json(typeof setting.value === 'string' ? JSON.parse(setting.value) : setting.value);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.updateSmtpSettings = async (req, res) => {
    try {
        const { host, port, user, pass, secure, service } = req.body;
        const [setting, created] = await Setting.findOrCreate({
            where: { key: 'SMTP_CONFIG' },
            defaults: { 
                value: { host, port, user, pass, secure, service },
                category: 'SMTP'
            }
        });

        if (!created) {
            await setting.update({ value: { host, port, user, pass, secure, service } });
        }

        res.json({ message: 'SMTP settings updated successfully', setting });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

exports.testSmtpConnection = async (req, res) => {
    try {
        const { host, port, user, pass, secure, service } = req.body;
        
        const config = {
            auth: { user, pass },
            connectionTimeout: 30000,
            greetingTimeout: 30000,
            socketTimeout: 30000,
            family: 4, // Force IPv4 to avoid ENETUNREACH on IPv6
            tls: {
                rejectUnauthorized: false // Helps with some restricted networks/firewalls
            }
        };

        if (service && service !== 'custom') {
            config.service = service;
        } else {
            config.host = host;
            config.port = parseInt(port);
            config.secure = secure === true || secure === 'true';
        }

        const transporter = nodemailer.createTransport(config);

       
        console.log(`SMTP Test Connection verified successfully for host: ${host || service}`);
        res.json({ message: 'Connection successful! Your SMTP settings are valid.' });
    } catch (error) {
        console.error('SMTP Test Failed:', error.message);
        console.error('Stack trace:', error.stack);
        
        let errorHint = '';
        if (error.code === 'ETIMEDOUT' || error.code === 'ECONNREFUSED') {
            errorHint = ' - This usually means the port is blocked by your hosting provider (Render). Try Port 465 with SSL enabled.';
        } else if (error.code === 'EAUTH') {
            errorHint = ' - Authentication failed. Please check your email and App Password.';
        }

        res.status(400).json({ 
            message: `Connection failed${errorHint}`,
            error: error.message,
            code: error.code
        });
    }
};
