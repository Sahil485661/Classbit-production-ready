const { Notice } = require('../models');
const { Op } = require('sequelize');

const createNotice = async (req, res) => {
    try {
        const data = { ...req.body };
        if (data.departmentId === '') data.departmentId = null;
        if (data.expiryDate === '') data.expiryDate = null;
        
        const notice = await Notice.create(data);
        res.status(201).json(notice);
    } catch (error) {
        if (error.name === 'SequelizeValidationError' || error.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({ message: 'Validation failed', details: error.errors.map(e => `${e.path}: ${e.message}`) });
        }
        res.status(500).json({ message: error.message });
    }
};

const getActiveNotices = async (req, res) => {
    try {
        const notices = await Notice.findAll({
            where: {
                isActive: true,
                [Op.or]: [
                    { expiryDate: null },
                    { expiryDate: { [Op.gte]: new Date() } }
                ]
            },
            order: [['createdAt', 'DESC']]
        });
        res.json(notices);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const deleteNotice = async (req, res) => {
    try {
        await Notice.destroy({ where: { id: req.params.id } });
        res.json({ message: 'Notice deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

const updateNotice = async (req, res) => {
    try {
        const notice = await Notice.findByPk(req.params.id);
        if (!notice) return res.status(404).json({ message: 'Notice not found' });
        
        const data = { ...req.body };
        if (data.departmentId === '') data.departmentId = null;
        if (data.expiryDate === '') data.expiryDate = null;

        await notice.update(data);
        res.json(notice);
    } catch (error) {
        if (error.name === 'SequelizeValidationError' || error.name === 'SequelizeUniqueConstraintError') {
            return res.status(400).json({ message: 'Validation failed', details: error.errors.map(e => `${e.path}: ${e.message}`) });
        }
        res.status(500).json({ message: error.message });
    }
};

module.exports = {
    createNotice,
    getActiveNotices,
    deleteNotice,
    updateNotice
};
