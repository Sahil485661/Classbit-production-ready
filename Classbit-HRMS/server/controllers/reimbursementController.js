const { ReimbursementCategory, ReimbursementClaim, Employee } = require('../models');
const { Op } = require('sequelize');
const { uploadToCloudinary, cloudinary } = require('../config/cloudinary');

// ─────────────────────────────────────────────────
// CATEGORY MANAGEMENT (Admin)
// ─────────────────────────────────────────────────

const getCategories = async (req, res) => {
    try {
        const categories = await ReimbursementCategory.findAll({ order: [['name', 'ASC']] });
        res.json(categories);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const createCategory = async (req, res) => {
    try {
        if (req.user.role !== 'Super Admin') return res.status(403).json({ message: 'Access denied' });
        const { name, description, maxLimit } = req.body;
        const cat = await ReimbursementCategory.create({ name, description, maxLimit });
        res.status(201).json({ message: 'Category created', category: cat });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const updateCategory = async (req, res) => {
    try {
        if (req.user.role !== 'Super Admin') return res.status(403).json({ message: 'Access denied' });
        const { id } = req.params;
        const { name, description, maxLimit, isActive } = req.body;
        
        const cat = await ReimbursementCategory.findByPk(id);
        if (!cat) return res.status(404).json({ message: 'Category not found' });
        
        await cat.update({ name, description, maxLimit, isActive });
        res.json({ message: 'Category updated', category: cat });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const deleteCategory = async (req, res) => {
    try {
        if (req.user.role !== 'Super Admin') return res.status(403).json({ message: 'Access denied' });
        const { id } = req.params;
        
        const claimCount = await ReimbursementClaim.count({ where: { categoryId: id } });
        if (claimCount > 0) return res.status(400).json({ message: 'Cannot delete category that has existing claims. Deactivate it instead.' });
        
        await ReimbursementCategory.destroy({ where: { id } });
        res.json({ message: 'Category deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// ─────────────────────────────────────────────────
// CLAIM MANAGEMENT (Employees / HR / Finance)
// ─────────────────────────────────────────────────

const submitClaim = async (req, res) => {
    try {
        const { categoryId, amount, expenseDate, description } = req.body;
        const employeeId = req.user.employeeId;
        
        if (!employeeId) return res.status(400).json({ message: 'Only active employees can submit claims' });
        
        // Validate Category Limit
        const cat = await ReimbursementCategory.findByPk(categoryId);
        if (!cat || !cat.isActive) return res.status(400).json({ message: 'Invalid or inactive category' });
        
        if (parseFloat(cat.maxLimit) > 0 && parseFloat(amount) > parseFloat(cat.maxLimit)) {
            return res.status(400).json({ message: `Amount exceeds the category limit of ₹${cat.maxLimit}` });
        }
        
        let receiptUrl = null;
        if (req.file) {
            try {
                const cloudResult = await uploadToCloudinary(req.file.buffer, {
                    folder: `hrms/reimbursement_receipts`,
                    resource_type: 'auto'
                });
                receiptUrl = cloudinary.url(cloudResult.public_id, {
                    secure: true,
                    fetch_format: 'auto',
                    quality: 'auto'
                });
            } catch (uploadError) {
                console.error('Cloudinary upload failed for reimbursement receipt:', uploadError);
                return res.status(500).json({ message: 'Failed to upload receipt' });
            }
        }

        if (!receiptUrl && parseFloat(amount) > 1000) { // Require receipt for large amounts
            return res.status(400).json({ message: 'Receipt is strictly required for amounts over ₹1000' });
        }
        
        const claim = await ReimbursementClaim.create({
            employeeId,
            categoryId,
            amount,
            expenseDate,
            description,
            receiptUrl,
            status: 'Pending'
        });
        
        res.status(201).json({ message: 'Claim submitted successfully', claim });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getMyClaims = async (req, res) => {
    try {
        const employeeId = req.user.employeeId;
        const claims = await ReimbursementClaim.findAll({
            where: { employeeId },
            include: [{ model: ReimbursementCategory, attributes: ['name'] }],
            order: [['createdAt', 'DESC']]
        });
        res.json(claims);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const getAllClaims = async (req, res) => {
    try {
        const { status, month, year } = req.query;
        const where = {};
        
        if (status) where.status = status;
        
        if (month && year) {
           const startDate = `${year}-${String(month).padStart(2, '0')}-01`;
           const endDate = new Date(year, month, 0).toISOString().split('T')[0];
           where.expenseDate = { [Op.between]: [startDate, endDate] };
        }
        
        const claims = await ReimbursementClaim.findAll({
            where,
            include: [
                { model: ReimbursementCategory, attributes: ['name'] },
                { model: Employee, attributes: ['id', 'firstName', 'lastName', 'employeeId'] }
            ],
            order: [['createdAt', 'DESC']]
        });
        
        res.json(claims);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const updateClaimStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { action, remarks } = req.body; // 'hr_approve', 'hr_reject', 'finance_verify', 'finance_reject'
        const role = req.user.role;
        const claim = await ReimbursementClaim.findByPk(id);
        
        if (!claim) return res.status(404).json({ message: 'Claim not found' });
        
        const updateData = {};
        
        if (action === 'hr_approve') {
            if (!['HR', 'Super Admin'].includes(role)) return res.status(403).json({ message: 'HR access required' });
            if (claim.status !== 'Pending') return res.status(400).json({ message: 'Claim must be Pending to HR Approve' });
            
            updateData.status = 'HR_Approved';
            if (remarks) updateData.hrRemarks = remarks;
            updateData.hrApproverId = req.user.id;
        } 
        else if (action === 'hr_reject') {
            if (!['HR', 'Super Admin'].includes(role)) return res.status(403).json({ message: 'HR access required' });
            if (claim.status !== 'Pending') return res.status(400).json({ message: 'Claim must be Pending to Reject' });
            
            updateData.status = 'Rejected';
            if (remarks) updateData.hrRemarks = remarks;
            updateData.hrApproverId = req.user.id;
        }
        else if (action === 'finance_verify') {
            if (!['Finance', 'Super Admin'].includes(role)) return res.status(403).json({ message: 'Finance access required' });
            if (claim.status !== 'HR_Approved') return res.status(400).json({ message: 'Claim must be HR_Approved to Finance Verify' });
            
            updateData.status = 'Finance_Verified';
            if (remarks) updateData.financeRemarks = remarks;
            updateData.financeApproverId = req.user.id;
        }
        else if (action === 'finance_reject') {
            if (!['Finance', 'Super Admin'].includes(role)) return res.status(403).json({ message: 'Finance access required' });
            if (claim.status !== 'HR_Approved') return res.status(400).json({ message: 'Claim must be HR_Approved to Reject' });
            
            updateData.status = 'Rejected';
            if (remarks) updateData.financeRemarks = remarks;
            updateData.financeApproverId = req.user.id;
        }
        else {
            return res.status(400).json({ message: 'Invalid action' });
        }
        
        await claim.update(updateData);
        res.json({ message: `Claim updated to ${updateData.status}`, claim });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    getCategories,
    createCategory,
    updateCategory,
    deleteCategory,
    submitClaim,
    getMyClaims,
    getAllClaims,
    updateClaimStatus
};
