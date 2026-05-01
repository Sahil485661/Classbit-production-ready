const { Employee, User, Role, Department, Loan } = require('../models');
const { createLog } = require('./activityController');

const getAllEmployees = async (req, res) => {
    try {
        const employees = await Employee.findAll({
            include: [
                { model: User, attributes: ['id', 'email', 'isActive', 'lastLogin', 'roleId'], include: [Role] },
                { model: Department },
                { model: Employee, as: 'Manager', attributes: ['id', 'firstName', 'lastName', 'userId'] }
            ]
        });
        res.json(employees);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getDeletedEmployees = async (req, res) => {
    try {
        const { Op } = require('sequelize');
        const employees = await Employee.findAll({
            where: {
                deletedAt: {
                    [Op.not]: null
                }
            },
            paranoid: false,
            include: [
                { model: User, attributes: ['id', 'email', 'isActive', 'lastLogin', 'roleId'], include: [Role], paranoid: false },
                { model: Department }
            ]
        });
        res.json(employees);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getEmployeeById = async (req, res) => {
    try {
        const employee = await Employee.findByPk(req.params.id, {
            paranoid: false,
            include: [
                { model: User, attributes: ['id', 'email', 'isActive', 'lastLogin', 'roleId'], include: [Role], paranoid: false },
                { model: Department },
                { model: Loan },
                { model: Employee, as: 'Manager', attributes: ['id', 'firstName', 'lastName', 'userId'] }
            ]
        });
        if (!employee) return res.status(404).json({ message: 'Employee not found' });
        res.json(employee);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const createEmployee = async (req, res) => {
    const transaction = await Employee.sequelize.transaction();
    try {
        const {
            email, password, roleId,
            employeeId, firstName, lastName, gender,
            joiningDate, departmentId, designation, status,
            fatherName, motherName, identityType, identityNumber,
            whatsappNumber, linkedinProfile, maritalStatus,
            emergencyContact, emergencyContactName, nationality,
            phone, dob, address, bankName, bankAccountNumber,
            bankIfscCode, accountHolderName, upiId,
            trainingPeriodMonths, probationPeriodMonths, managerId
        } = req.body;

        const profilePicture = req.file ? req.file.filename : null;

        // Create User first
        const user = await User.create({
            email,
            password: password || 'password123',
            roleId
        }, { transaction });

        // Create Employee record
        const employee = await Employee.create({
            userId: user.id,
            employeeId,
            firstName,
            lastName,
            gender,
            joiningDate,
            departmentId: departmentId || null,
            designation,
            status: status || 'Active',
            fatherName,
            motherName,
            identityType,
            identityNumber,
            whatsappNumber,
            linkedinProfile,
            maritalStatus,
            emergencyContact,
            emergencyContactName,
            nationality,
            phone,
            dob: dob || null,
            address,
            bankName,
            bankAccountNumber,
            bankIfscCode,
            accountHolderName,
            upiId,
            trainingPeriodMonths: parseInt(trainingPeriodMonths) || 0,
            probationPeriodMonths: parseInt(probationPeriodMonths) || 0,
            profilePicture,
            managerId: managerId || null
        }, { transaction });

        await transaction.commit();
        await createLog(req.user.id, 'CREATE_EMPLOYEE', 'Employees', `Added new employee ${firstName} ${lastName} (${employeeId}).`);
        res.status(201).json(employee);
    } catch (error) {
        await transaction.rollback();
        console.error('Employee Creation Error:', error);
        
        if (error.name === 'SequelizeValidationError' || error.name === 'SequelizeUniqueConstraintError') {
            const messages = error.errors.map(e => `${e.path}: ${e.message}`);
            return res.status(400).json({ message: 'Validation failed', details: messages });
        }
        
        res.status(500).json({ message: error.message });
    }
};

const updateEmployee = async (req, res) => {
    try {
        const { email, password, roleId, ...employeeData } = req.body;
        const employee = await Employee.findByPk(req.params.id, { include: [User] });
        if (!employee) return res.status(404).json({ message: 'Employee not found' });

        if (req.file) {
            employeeData.profilePicture = req.file.filename;
        }

        // Update Employee
        await employee.update(employeeData);

        // Update User if related fields provided
        if (email || password || roleId) {
            const user = await User.findByPk(employee.userId);
            if (user) {
                if (email) user.email = email;
                if (roleId) user.roleId = roleId;
                if (password) user.password = password; // Hook handles hashing
                await user.save();
            }
        }

        await createLog(req.user.id, 'UPDATE_EMPLOYEE', 'Employees', `Updated profile data for ${employee.firstName} ${employee.lastName}.`);
        res.json(employee);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const deleteEmployee = async (req, res) => {
    try {
        const employee = await Employee.findByPk(req.params.id);
        if (!employee) return res.status(404).json({ message: 'Employee not found' });

        // Soft delete / Deactivate
        employee.status = 'Inactive';
        await employee.save();

        const user = await User.findByPk(employee.userId);
        user.isActive = false;
        await user.save();

        await createLog(req.user.id, 'DEACTIVATE_EMPLOYEE', 'Employees', `Deactivated employee ${employee.firstName} ${employee.lastName}.`);
        res.json({ message: 'Employee deactivated successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getRoles = async (req, res) => {
    try {
        const roles = await Role.findAll();
        res.json(roles);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const createRole = async (req, res) => {
    try {
        const { name, description, permissions } = req.body;
        const role = await Role.create({ name, description, permissions: permissions || [] });
        res.status(201).json(role);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const updateRole = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, permissions } = req.body;
        const role = await Role.findByPk(id);
        if (!role) return res.status(404).json({ message: 'Role not found' });

        await role.update({ name, description, permissions: permissions || [] });
        res.json(role);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getDepartments = async (req, res) => {
    try {
        const depts = await Department.findAll();
        res.json(depts);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const createDepartment = async (req, res) => {
    try {
        const dept = await Department.create(req.body);
        res.status(201).json(dept);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const reactivateEmployee = async (req, res) => {
    try {
        const employee = await Employee.findByPk(req.params.id);
        if (!employee) return res.status(404).json({ message: 'Employee not found' });

        employee.status = 'Active';
        await employee.save();

        const user = await User.findByPk(employee.userId);
        if (user) {
            user.isActive = true;
            await user.save();
        }

        await createLog(req.user.id, 'REACTIVATE_EMPLOYEE', 'Employees', `Reactivated employee ${employee.firstName} ${employee.lastName}.`);
        res.json({ message: 'Employee reactivated successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const fullDeleteEmployee = async (req, res) => {
    try {
        const employee = await Employee.findByPk(req.params.id);
        if (!employee) return res.status(404).json({ message: 'Employee not found' });

        const userId = employee.userId;

        const user = await User.findByPk(userId);
        if (user) {
            await user.destroy();
        } else {
            // If user missing for some reason, delete employee directly
            await employee.destroy();
        }

        await createLog(req.user.id, 'DELETE_EMPLOYEE', 'Employees', `Permanently deleted employee ${employee.firstName} ${employee.lastName}.`);
        res.json({ message: 'Employee data fully deleted successfully' });
    } catch (error) {
        console.error('Error in fullDeleteEmployee:', error);
        res.status(500).json({ message: 'Error deleting employee: ' + error.message });
    }
};

const adminForcePasswordReset = async (req, res) => {
    try {
        if (req.user.role !== 'Super Admin') {
            return res.status(403).json({ message: 'Only Super Admin can force password resets.' });
        }
        
        const { adminPassword } = req.body;
        if (!adminPassword) {
            return res.status(400).json({ message: 'Admin password is required to confirm this action.' });
        }

        const adminUser = await User.findByPk(req.user.id);
        if (!adminUser) return res.status(401).json({ message: 'Unauthorized' });

        const isMatch = await adminUser.comparePassword(adminPassword);
        if (!isMatch) {
            return res.status(403).json({ message: 'Incorrect Admin password. Action denied.' });
        }

        const { id } = req.params;
        const employee = await Employee.findByPk(id, { include: [User] });
        if (!employee || !employee.User) return res.status(404).json({ message: 'Employee not found' });
        
        const charsLower = 'abcdefghijklmnopqrstuvwxyz';
        const charsUpper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const numbers = '0123456789';
        const specials = '@$!%*?&';
        
        let newPassword = '';
        newPassword += charsUpper.charAt(Math.floor(Math.random() * charsUpper.length));
        newPassword += numbers.charAt(Math.floor(Math.random() * numbers.length));
        newPassword += specials.charAt(Math.floor(Math.random() * specials.length));
        for(let i=0; i<5; i++) {
            newPassword += charsLower.charAt(Math.floor(Math.random() * charsLower.length));
        }

        employee.User.password = newPassword;
        employee.User.needsPasswordChange = true;
        await employee.User.save();

        await createLog(req.user.id, 'FORCE_PASSWORD_RESET', 'Employees', `Admin forced password reset for ${employee.firstName} ${employee.lastName}`);
        
        res.json({ message: 'Password reset successfully', tempPassword: newPassword });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const promoteToManager = async (req, res) => {
    try {
        const employee = await Employee.findByPk(req.params.id, { include: [User] });
        if (!employee) return res.status(404).json({ message: 'Employee not found' });

        const managerRole = await Role.findOne({ where: { name: 'Manager' } });
        if (!managerRole) return res.status(500).json({ message: 'System Manager role not found. Please create it first.' });

        employee.designation = 'Manager';
        await employee.save();

        const user = employee.User;
        if (user) {
            user.roleId = managerRole.id;
            await user.save();
        }

        await createLog(req.user.id, 'PROMOTE_TO_MANAGER', 'Employees', `Promoted ${employee.firstName} ${employee.lastName} to Manager.`);
        res.json({ message: 'Employee successfully promoted to Manager', employee });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const demoteToEmployee = async (req, res) => {
    try {
        const employee = await Employee.findByPk(req.params.id, { include: [User] });
        if (!employee) return res.status(404).json({ message: 'Employee not found' });

        const employeeRole = await Role.findOne({ where: { name: 'Employee' } });
        if (!employeeRole) return res.status(500).json({ message: 'System Employee role not found.' });

        // Update any sub-employees to remove this manager? 
        // We'll optionally nullify them so they don't report to a non-manager
        await Employee.update(
            { managerId: null },
            { where: { managerId: employee.id } }
        );

        employee.designation = 'Employee';
        await employee.save();

        const user = employee.User;
        if (user) {
            user.roleId = employeeRole.id;
            await user.save();
        }

        await createLog(req.user.id, 'DEMOTE_TO_EMPLOYEE', 'Employees', `Demoted ${employee.firstName} ${employee.lastName} back to Employee.`);
        res.json({ message: 'Employee successfully demoted', employee });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getAllEmployees,
    getEmployeeById,
    createEmployee,
    updateEmployee,
    deleteEmployee,
    getRoles,
    createRole,
    updateRole,
    getDepartments,
    createDepartment,
    reactivateEmployee,
    fullDeleteEmployee,
    getDeletedEmployees,
    adminForcePasswordReset,
    promoteToManager,
    demoteToEmployee
};
