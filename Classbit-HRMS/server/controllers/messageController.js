const { Message, User, Employee, Department, ChatGroup, ChatGroupMember } = require('../models');
const { Op } = require('sequelize');
const { uploadToCloudinary, cloudinary } = require('../config/cloudinary');

const sendMessage = async (req, res) => {
    try {
        const { recipientId, departmentId, groupId, subject = 'Chat Message', content = '' } = req.body;
        let attachment = null;
        if (req.file) {
            try {
                const cloudResult = await uploadToCloudinary(req.file.buffer, {
                    folder: `hrms/chat_attachments`,
                    resource_type: 'auto'
                });
                attachment = cloudinary.url(cloudResult.public_id, {
                    secure: true,
                    fetch_format: 'auto',
                    quality: 'auto'
                });
            } catch (uploadError) {
                console.error('Cloudinary upload failed for chat attachment:', uploadError);
                return res.status(500).json({ message: 'Failed to upload attachment' });
            }
        }

        // At least one of content or attachment must be present
        if (!content.trim() && !attachment) {
            return res.status(400).json({ message: 'Message content or attachment is required' });
        }

        if (departmentId) {
            // Broadcast to department
            const employees = await Employee.findAll({ where: { departmentId } });
            const messages = employees.map(emp => ({
                senderId: req.user.id,
                recipientId: emp.userId,
                departmentId,
                subject,
                content,
                attachment
            }));
            await Message.bulkCreate(messages);
            return res.status(201).json({ message: 'Broadcast sent successfully' });
        }

        if (groupId) {
            const group = await ChatGroup.findByPk(groupId, {
                include: [{ model: ChatGroupMember }]
            });
            if (!group) return res.status(404).json({ message: 'Group not found' });
            
            const messages = group.ChatGroupMembers.map(member => ({
                senderId: req.user.id,
                recipientId: member.userId,
                groupId,
                subject,
                content,
                attachment,
                isRead: member.userId === req.user.id
            }));
            
            await Message.bulkCreate(messages);
            return res.status(201).json({ message: 'Group messages sent successfully' });
        }

        const targetEmployee = await Employee.findByPk(recipientId);
        if (!targetEmployee) return res.status(404).json({ message: 'Recipient not found' });

        const message = await Message.create({
            senderId: req.user.id,
            recipientId: targetEmployee.userId,
            subject,
            content,
            attachment
        });
        res.status(201).json(message);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getInbox = async (req, res) => {
    try {
        const messages = await Message.findAll({
            where: { recipientId: req.user.id },
            include: [{ model: User, as: 'Sender', attributes: ['email'], include: [Employee] }],
            order: [['createdAt', 'DESC']]
        });
        res.json(messages);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getOutbox = async (req, res) => {
    try {
        const messages = await Message.findAll({
            where: { senderId: req.user.id },
            include: [{ model: User, as: 'Recipient', attributes: ['email'], include: [Employee] }],
            order: [['createdAt', 'DESC']]
        });
        res.json(messages);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const markAsRead = async (req, res) => {
    try {
        await Message.update({ isRead: true }, { where: { id: req.params.id, recipientId: req.user.id } });
        res.json({ message: 'Message marked as read' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getConversation = async (req, res) => {
    try {
        const { recipientId } = req.params; // This is the employee ID from frontend
        const targetEmployee = await Employee.findByPk(recipientId);
        if (!targetEmployee) return res.status(404).json({ message: 'Recipient not found' });

        const messages = await Message.findAll({
            where: {
                [Op.or]: [
                    { senderId: req.user.id, recipientId: targetEmployee.userId },
                    { senderId: targetEmployee.userId, recipientId: req.user.id }
                ]
            },
            include: [
                { model: User, as: 'Sender', attributes: ['id', 'email'] }
            ],
            order: [['createdAt', 'ASC']]
        });

        // Mark received messages as read
        await Message.update(
            { isRead: true },
            {
                where: {
                    recipientId: req.user.id,
                    senderId: targetEmployee.userId,
                    isRead: false
                }
            }
        );

        res.json(messages);
    } catch (error) {
        console.error('getConversation Error:', error);
        res.status(500).json({ message: error.message });
    }
};

const getDepartmentConversation = async (req, res) => {
    try {
        const { departmentId } = req.params;

        const allBroadcasts = await Message.findAll({
            where: { departmentId },
            include: [ { model: User, as: 'Sender', attributes: ['id', 'email'] } ],
            order: [['createdAt', 'ASC']]
        });

        // Filter out duplicates (created for each employee in the bulkCreate)
        const uniqueMessages = [];
        const seen = new Set();
        for (const msg of allBroadcasts) {
            // Deduplicate based on exact sender, content, and the timestamp string
            const key = `${msg.senderId}_${msg.content}_${msg.createdAt.getTime()}`;
            if (!seen.has(key)) {
                seen.add(key);
                uniqueMessages.push(msg);
            }
        }

        res.json(uniqueMessages);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getChatGroups = async (req, res) => {
    try {
        const userId = req.user.id;
        const memberships = await ChatGroupMember.findAll({
            where: { userId },
            include: [{
                model: ChatGroup,
                include: [{ model: User, as: 'Creator', attributes: ['email'] }]
            }]
        });
        
        const groups = memberships.map(m => m.ChatGroup);
        res.json(groups);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const createChatGroup = async (req, res) => {
    try {
        const { name, memberIds } = req.body; // memberIds are array of Employee IDs from frontend
        if (!name || !memberIds || !memberIds.length) {
            return res.status(400).json({ message: 'Group name and members are required' });
        }

        const group = await ChatGroup.create({ name, creatorId: req.user.id });

        // Include the creator in the group automatically
        const userIds = [req.user.id];

        // Fetch User IDs for the provided Employee IDs
        const employees = await Employee.findAll({ where: { id: memberIds } });
        employees.forEach(emp => {
            if (emp.userId !== req.user.id) {
                userIds.push(emp.userId);
            }
        });

        const members = userIds.map(uid => ({ groupId: group.id, userId: uid }));
        await ChatGroupMember.bulkCreate(members);

        res.status(201).json(group);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getGroupConversation = async (req, res) => {
    try {
        const { groupId } = req.params;
        const allMessages = await Message.findAll({
            where: { groupId },
            include: [ { model: User, as: 'Sender', attributes: ['id', 'email'], include: [Employee] } ],
            order: [['createdAt', 'ASC']]
        });
        
        // Deduplicate
        const uniqueMessages = [];
        const seen = new Set();
        for (const msg of allMessages) {
            const key = `${msg.senderId}_${msg.content}_${msg.createdAt.getTime()}`;
            if (!seen.has(key)) {
                seen.add(key);
                uniqueMessages.push(msg);
            }
        }
        
        // Mark as read for this user
        await Message.update(
            { isRead: true },
            {
                where: {
                    groupId,
                    recipientId: req.user.id,
                    isRead: false
                }
            }
        );

        res.json(uniqueMessages);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    sendMessage,
    getInbox,
    getOutbox,
    getConversation,
    getDepartmentConversation,
    getChatGroups,
    createChatGroup,
    getGroupConversation,
    markAsRead
};
