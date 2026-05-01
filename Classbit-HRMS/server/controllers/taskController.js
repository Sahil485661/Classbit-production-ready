const { sequelize } = require('../config/db');
const { Task, TaskAssignment, Employee, User, Department, Role, Notification, TaskAttachment, TaskActivity, TaskComment } = require('../models');
const { Op } = require('sequelize');
const { createLog } = require('./activityController');
const { uploadToCloudinary, cloudinary } = require('../config/cloudinary');

const createTask = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { title, description, deadline, priority, assignmentType, assigneeIds, departmentId } = req.body;

        // Verify creator existence
        const creator = await User.findByPk(req.user.id);
        if (!creator) {
            return res.status(401).json({ message: `Session user ID ${req.user.id} not found in database. Please log out and log back in.` });
        }

        const task = await Task.create({
            title,
            description,
            deadline,
            priority,
            createdBy: creator.id,
            assignmentType: assignmentType || 'Single',
            assignedDepartmentId: departmentId || null
        }, { transaction: t });

        let finalAssigneeIds = [];

        if (assignmentType === 'Single' || assignmentType === 'Single Employee' || assignmentType === 'Multiple' || assignmentType === 'Multiple Employees') {
            finalAssigneeIds = Array.isArray(assigneeIds) ? assigneeIds : (assigneeIds ? [assigneeIds] : []);
            if (finalAssigneeIds.length === 0) {
                await t.rollback();
                return res.status(400).json({ message: 'No employees selected for assignment' });
            }
        } else if (assignmentType === 'Department' || assignmentType === 'Entire Department') {
            if (!departmentId) {
                await t.rollback();
                return res.status(400).json({ message: 'Department must be specified for department assignment' });
            }
            const employees = await Employee.findAll({ where: { departmentId: parseInt(departmentId) } });
            finalAssigneeIds = employees.map(e => e.id);
        } else if (assignmentType === 'All' || assignmentType === 'All Employees') {
            const employees = await Employee.findAll({ where: { status: 'Active' } });
            finalAssigneeIds = employees.map(e => e.id);
        }

        if (finalAssigneeIds.length === 0) {
            await t.rollback();
            return res.status(400).json({ message: 'No active employees found for the selected assignment criteria' });
        }

        const assignments = finalAssigneeIds.map(empId => ({
            taskId: task.id,
            employeeId: empId
        }));

        await TaskAssignment.bulkCreate(assignments, { transaction: t });

        // Create Notifications for assignees
        const assigneeUsers = await Employee.findAll({
            where: { id: finalAssigneeIds },
            attributes: ['userId']
        });

        const notifications = assigneeUsers.map(emp => ({
            userId: emp.userId,
            title: 'New Task Assigned',
            message: `New task: "${title || 'Untitled Task'}" has been assigned to you.`,
            type: 'Task',
            relatedId: task.id
        }));

        await Notification.bulkCreate(notifications, { transaction: t });

        await TaskActivity.create({
            taskId: task.id,
            userId: req.user.id,
            action: 'Created',
            details: `Task created and assigned to ${finalAssigneeIds.length} employee(s).`
        }, { transaction: t });

        await t.commit();
        await createLog(req.user.id, 'CREATE_TASK', 'Tasks', `Assigned new task "${title}" to ${finalAssigneeIds.length} employee(s).`);
        res.status(201).json(task);
    } catch (error) {
        await t.rollback();
        res.status(500).json({ message: error.message });
    }
};

const getMyTasks = async (req, res) => {
    try {
        const { role, employeeId, id: userId } = req.user;

        let tasks;
        const commonInclude = [
            { model: User, as: 'Creator', include: [{ model: Employee, attributes: ['firstName', 'lastName'] }] },
            { model: TaskAttachment },
            { model: Department, as: 'AssignedDepartment', attributes: ['name'] }
        ];

        if (role === 'Super Admin' || role === 'HR') {
            tasks = await Task.findAll({
                include: [...commonInclude, { model: TaskAssignment, include: [{ model: Employee, attributes: ['id', 'firstName', 'lastName', 'designation'] }] }],
                order: [['createdAt', 'DESC']]
            });
        } else if (role === 'Manager') {
            tasks = await Task.findAll({
                include: [
                    ...commonInclude,
                    {
                        model: TaskAssignment,
                        include: [{ model: Employee, attributes: ['id', 'firstName', 'lastName', 'designation'] }]
                    }
                ],
                where: {
                    [Op.or]: [
                        { '$TaskAssignments.employeeId$': employeeId },
                        { createdBy: userId }
                    ]
                },
                order: [['createdAt', 'DESC']]
            });
        } else {
            // Regular Employee
            tasks = await Task.findAll({
                include: [
                    ...commonInclude,
                    {
                        model: TaskAssignment,
                        where: { employeeId },
                        required: true,
                        include: [{ model: Employee, attributes: ['id', 'firstName', 'lastName', 'designation'] }]
                    }
                ],
                order: [['createdAt', 'DESC']]
            });
        }

        res.json(tasks);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const updateTaskStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const task = await Task.findByPk(req.params.id);
        if (!task) return res.status(404).json({ message: 'Task not found' });

        const assignment = await TaskAssignment.findOne({
            where: { taskId: task.id, employeeId: req.user.employeeId }
        });

        if (!assignment && req.user.role !== 'Super Admin' && req.user.role !== 'HR' && task.createdBy !== req.user.id) {
            return res.status(403).json({ message: 'Not authorized to update this task' });
        }

        // Enforce forward-only progression for Employees
        if (req.user.role === 'Employee') {
            if (task.status === 'In Progress' && status === 'Open') {
                return res.status(403).json({ message: 'Employees cannot move a task from In Progress back to Open.' });
            }
            if (task.status === 'Completed' && status !== 'Completed') {
                return res.status(403).json({ message: 'Employees cannot reopen a completed task.' });
            }
        }

        const oldStatus = task.status;
        task.status = status;
        await task.save();

        await TaskActivity.create({
            taskId: task.id,
            userId: req.user.id,
            action: 'Status Changed',
            details: `Status updated from ${oldStatus} to ${status}.`
        });

        if (status === 'Completed') {
            await createLog(req.user.id, 'COMPLETE_TASK', 'Tasks', `Marked task "${task.title}" as Completed.`);
        }

        res.json(task);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const updateTaskDetails = async (req, res) => {
    const t = await sequelize.transaction();
    try {
        const { title, description, deadline, priority, assignmentType, assigneeIds, departmentId } = req.body;
        const { role, id: userId } = req.user;
        const task = await Task.findByPk(req.params.id);

        if (!task) {
            await t.rollback();
            return res.status(404).json({ message: 'Task not found' });
        }

        // Authorization check: User must be an Admin/HR/Manager, OR the actual creator of the task
        if (role === 'Employee' && task.createdBy !== userId) {
            await t.rollback();
            return res.status(403).json({ message: 'Not authorized to edit this task' });
        }

        task.title = title || task.title;
        task.description = description || task.description;
        task.deadline = deadline || task.deadline;
        task.priority = priority || task.priority;

        if (assignmentType) {
            let finalAssigneeIds = [];

            if (assignmentType === 'Single' || assignmentType === 'Single Employee' || assignmentType === 'Multiple' || assignmentType === 'Multiple Employees') {
                finalAssigneeIds = Array.isArray(assigneeIds) ? assigneeIds : (assigneeIds ? [assigneeIds] : []);
                if (finalAssigneeIds.length === 0) {
                    await t.rollback();
                    return res.status(400).json({ message: 'No employees selected for assignment' });
                }
            } else if (assignmentType === 'Department' || assignmentType === 'Entire Department') {
                if (!departmentId) {
                    await t.rollback();
                    return res.status(400).json({ message: 'Department must be specified' });
                }
                const employees = await Employee.findAll({ where: { departmentId: parseInt(departmentId) } });
                finalAssigneeIds = employees.map(e => e.id);
            } else if (assignmentType === 'All' || assignmentType === 'All Employees') {
                const employees = await Employee.findAll({ where: { status: 'Active' } });
                finalAssigneeIds = employees.map(e => e.id);
            }

            if (finalAssigneeIds.length === 0) {
                await t.rollback();
                return res.status(400).json({ message: 'No employees found for this criteria' });
            }

            task.assignmentType = assignmentType;
            task.assignedDepartmentId = departmentId || null;

            await TaskAssignment.destroy({ where: { taskId: task.id }, transaction: t });

            const assignments = finalAssigneeIds.map(empId => ({
                taskId: task.id,
                employeeId: empId
            }));

            await TaskAssignment.bulkCreate(assignments, { transaction: t });
        }

        await task.save({ transaction: t });

        await TaskActivity.create({
            taskId: task.id,
            userId: req.user.id,
            action: 'Updated Details',
            details: `Task details or assignments were updated.`
        }, { transaction: t });

        await t.commit();

        res.json(task);
    } catch (error) {
        await t.rollback();
        res.status(500).json({ message: error.message });
    }
};

const uploadTaskAttachment = async (req, res) => {
    try {
        const taskId = req.params.id;
        const uploaderId = req.user.id;
        
        // Ensure task exists
        const task = await Task.findByPk(taskId);
        if (!task) return res.status(404).json({ message: 'Task not found' });

        if (!req.file) {
            return res.status(400).json({ message: 'No file provided' });
        }

        let fileUrl = null;
        try {
            const cloudResult = await uploadToCloudinary(req.file.buffer, {
                folder: `hrms/task_attachments`,
                resource_type: 'auto'
            });
            fileUrl = cloudinary.url(cloudResult.public_id, {
                secure: true,
                fetch_format: 'auto',
                quality: 'auto'
            });
        } catch (uploadError) {
            console.error('Cloudinary upload failed for task attachment:', uploadError);
            return res.status(500).json({ message: 'Failed to upload attachment to cloud storage' });
        }

        const attachment = await TaskAttachment.create({
            taskId: taskId,
            uploaderId: uploaderId,
            fileName: req.file.originalname,
            originalName: req.file.originalname,
            fileUrl: fileUrl,
            fileType: req.file.mimetype,
            fileSize: req.file.size
        });

        // Fetch with uploader data
        const attachmentWithMemeber = await TaskAttachment.findByPk(attachment.id, {
            include: [{
                model: User,
                as: 'Uploader',
                include: [{ model: Employee, attributes: ['firstName', 'lastName'] }]
            }]
        });

        await TaskActivity.create({
            taskId: taskId,
            userId: req.user.id,
            action: 'Attachment Uploaded',
            details: `File attached: ${req.file.originalname}`
        });

        await createLog(req.user.id, 'UPLOAD_ATTACHMENT', 'Tasks', `Attached file "${req.file.originalname}" to task "${task.title}".`);

        res.status(201).json(attachmentWithMemeber);
    } catch (error) {
        console.error('Upload Error:', error);
        res.status(500).json({ message: error.message });
    }
};

const getTaskAttachments = async (req, res) => {
    try {
        const taskId = req.params.id;
        
        const attachments = await TaskAttachment.findAll({
            where: { taskId },
            include: [{
                model: User,
                as: 'Uploader',
                include: [{ model: Employee, attributes: ['firstName', 'lastName'] }]
            }],
            order: [['createdAt', 'DESC']]
        });

        res.json(attachments);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getTaskDetails = async (req, res) => {
    try {
        const taskId = req.params.id;
        const task = await Task.findByPk(taskId, {
            include: [
                { model: User, as: 'Creator', include: [{ model: Employee, attributes: ['firstName', 'lastName'] }] },
                { model: Department, as: 'AssignedDepartment', attributes: ['name'] },
                { model: TaskAssignment, include: [{ model: Employee, attributes: ['id', 'firstName', 'lastName', 'designation', 'profilePicture'] }] },
                { model: TaskAttachment, include: [{ model: User, as: 'Uploader', include: [{ model: Employee, attributes: ['firstName', 'lastName', 'profilePicture'] }] }] },
                { model: TaskActivity, include: [{ model: User, as: 'User', include: [{ model: Employee, attributes: ['firstName', 'lastName', 'designation'] }] }] },
                { model: TaskComment, include: [{ model: User, as: 'User', include: [{ model: Employee, attributes: ['firstName', 'lastName', 'designation', 'profilePicture'] }] }] }
            ],
            order: [
                [TaskActivity, 'createdAt', 'DESC'],
                [TaskAttachment, 'createdAt', 'DESC'],
                [TaskComment, 'createdAt', 'ASC']
            ]
        });

        if (!task) return res.status(404).json({ message: 'Task not found' });
        res.json(task);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const addTaskComment = async (req, res) => {
    try {
        const { id } = req.params;
        const { text } = req.body;

        if (!text || text.trim() === '') {
            return res.status(400).json({ message: 'Comment text cannot be empty' });
        }

        const task = await Task.findByPk(id);
        if (!task) return res.status(404).json({ message: 'Task not found' });

        const comment = await TaskComment.create({
            taskId: id,
            userId: req.user.id,
            text
        });

        // Fetch back with user structure
        const commentWithUser = await TaskComment.findByPk(comment.id, {
            include: [{ model: User, as: 'User', include: [{ model: Employee, attributes: ['firstName', 'lastName', 'designation', 'profilePicture'] }] }]
        });

        res.status(201).json(commentWithUser);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    createTask,
    getMyTasks,
    updateTaskStatus,
    updateTaskDetails,
    uploadTaskAttachment,
    getTaskAttachments,
    getTaskDetails,
    addTaskComment
};
