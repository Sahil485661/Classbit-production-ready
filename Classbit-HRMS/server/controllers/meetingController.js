const { Meeting, Employee, User, ActivityLog, Notification } = require('../models');
const { sendTemplatedEmail } = require('../utils/emailService');

exports.createMeeting = async (req, res) => {
    try {
        const { title, dateTime, agenda, meetingLink, targetAudience } = req.body;
        const meeting = await Meeting.create({
            title,
            dateTime,
            agenda,
            meetingLink,
            organizerId: req.user.id,
            targetAudience: targetAudience || { type: 'all', data: [] }
        });

        // Add to Activity Log
        await ActivityLog.create({
            userId: req.user.id,
            action: 'Created Meeting',
            module: 'Meetings',
            details: `Scheduled meeting: ${title}`
        });

        // Determine targets for notification
        let aud = targetAudience || { type: 'all', data: [] };
        let targetedIds = [];
        if (aud.type === 'all') {
            const users = await User.findAll({ attributes: ['id'] });
            targetedIds = users.map(u => u.id);
        } else if (aud.type === 'departments') {
            const employees = await Employee.findAll({ where: { departmentId: aud.data } });
            targetedIds = employees.map(e => e.userId);
        } else if (aud.type === 'employees') {
            const employees = await Employee.findAll({ where: { id: aud.data } });
            targetedIds = employees.map(e => e.userId);
        }

        // Create Notifications
        const notifs = targetedIds.map(uid => ({
            userId: uid,
            title: 'New Meeting Scheduled',
            message: `You have been added to: ${title} at ${new Date(dateTime).toLocaleString()}`,
            type: 'System',
            isRead: false
        }));
        if (notifs.length > 0) {
            await Notification.bulkCreate(notifs);
        }

        // Send Email Automatically
        let targetedEmployees = await Employee.findAll({
            where: { userId: targetedIds },
            include: [User]
        });

        for (const emp of targetedEmployees) {
            const email = emp.User?.email;
            if (email) {
                await sendTemplatedEmail('MEETING_INVITE', email, {
                    employee_name: emp.firstName,
                    title: title,
                    date: new Date(dateTime).toLocaleDateString(),
                    time: new Date(dateTime).toLocaleTimeString(),
                    link: meetingLink || 'No direct link provided',
                    description: agenda || 'No agenda provided',
                    company_name: 'Classbit HRMS'
                }, 'Meetings-Module-Auto');
            }
        }

        res.status(201).json({ message: 'Meeting created successfully, notifications and emails sent.', meeting });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

exports.getMeetings = async (req, res) => {
    try {
        const role = req.user.role; // Assuming JWT payload has role name
        let meetings = await Meeting.findAll({
            order: [['dateTime', 'ASC']]
        });

        if (role !== 'Super Admin' && role !== 'HR' && role !== 'Manager') {
            // Employee view: Filter based on targetAudience
            const employee = await Employee.findOne({ where: { userId: req.user.id } });
            if (!employee) return res.status(404).json({ message: 'Employee profile not found' });

            meetings = meetings.filter(m => {
                let aud = m.targetAudience || { type: 'all' };
                if (typeof aud === 'string') {
                    try { aud = JSON.parse(aud); } catch(e) { aud = { type: 'all' }; }
                }
                if (aud.type === 'all') return true;
                if (aud.type === 'departments' && aud.data.includes(employee.departmentId)) return true;
                if (aud.type === 'employees' && aud.data.includes(employee.id)) return true;
                return false;
            });

            const parsedMeetings = meetings.map(m => {
                const plainMeeting = m.toJSON();
                let reactions = plainMeeting.employeeReactions || [];
                if (typeof reactions === 'string') {
                    try { reactions = JSON.parse(reactions); } catch(e) { reactions = []; }
                }
                // We use employeeId in reactions array
                const myReactionObj = reactions.find(r => r.employeeId === employee.id);
                plainMeeting.myReaction = myReactionObj ? myReactionObj.status : null;
                return plainMeeting;
            });
            return res.status(200).json(parsedMeetings);
        }

        res.status(200).json(meetings);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

exports.updateMeeting = async (req, res) => {
    try {
        const { id } = req.params;
        const meeting = await Meeting.findByPk(id);
        if (!meeting) return res.status(404).json({ message: 'Meeting not found' });

        await meeting.update(req.body);

        await ActivityLog.create({
            userId: req.user.id,
            action: 'Updated Meeting',
            module: 'Meetings',
            details: `Updated meeting: ${meeting.title}`
        });

        res.status(200).json({ message: 'Meeting updated successfully', meeting });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

exports.deleteMeeting = async (req, res) => {
    try {
        const { id } = req.params;
        const meeting = await Meeting.findByPk(id);
        if (!meeting) return res.status(404).json({ message: 'Meeting not found' });

        await meeting.destroy();

        await ActivityLog.create({
            userId: req.user.id,
            action: 'Deleted Meeting',
            module: 'Meetings',
            details: `Deleted meeting: ${meeting.title}`
        });

        res.status(200).json({ message: 'Meeting canceled successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

exports.reactToMeeting = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body; // 'Accepted' or 'Rejected'
        const meeting = await Meeting.findByPk(id);
        
        if (!meeting) return res.status(404).json({ message: 'Meeting not found' });

        const employee = await Employee.findOne({ where: { userId: req.user.id } });
        if (!employee) return res.status(404).json({ message: 'Employee profile not found' });

        let reactions = meeting.employeeReactions || [];
        // Remove existing reaction if any
        reactions = reactions.filter(r => r.employeeId !== employee.id);
        // Add new reaction
        reactions.push({
            employeeId: employee.id,
            status,
            timestamp: new Date()
        });

        // Tell Sequelize that JSON got updated
        meeting.employeeReactions = reactions;
        meeting.changed('employeeReactions', true);
        await meeting.save();

        res.status(200).json({ message: `Meeting ${status} successfully`, meeting });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

exports.sendMeetingEmail = async (req, res) => {
    try {
        const { id } = req.params;
        const meeting = await Meeting.findByPk(id);
        if (!meeting) return res.status(404).json({ message: 'Meeting not found' });

        let aud = meeting.targetAudience || { type: 'all', data: [] };
        if (typeof aud === 'string') {
            try { aud = JSON.parse(aud); } catch(e) { aud = { type: 'all', data: [] }; }
        }

        let targetedEmployees = [];
        if (aud.type === 'all') {
            targetedEmployees = await Employee.findAll({ include: [User] });
        } else if (aud.type === 'departments') {
            targetedEmployees = await Employee.findAll({ where: { departmentId: aud.data }, include: [User] });
        } else if (aud.type === 'employees') {
            targetedEmployees = await Employee.findAll({ where: { id: aud.data }, include: [User] });
        }

        let sentCount = 0;
        for (const emp of targetedEmployees) {
            const email = emp.User?.email;
            if (email) {
                const success = await sendTemplatedEmail('MEETING_INVITE', email, {
                    employee_name: emp.firstName,
                    title: meeting.title,
                    date: new Date(meeting.dateTime).toLocaleDateString(),
                    time: new Date(meeting.dateTime).toLocaleTimeString(),
                    link: meeting.meetingLink || 'No direct link provided',
                    description: meeting.agenda || 'No agenda provided',
                    company_name: 'Classbit HRMS'
                }, 'Meetings-Module');
                if (success) sentCount++;
            }
        }

        if (sentCount > 0) {
            res.status(200).json({ message: `Emails dispatched successfully to ${sentCount} employees.` });
        } else {
            res.status(200).json({ message: 'No emails were sent. Please check your SMTP configuration or employee email addresses.' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};
