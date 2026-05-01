const express = require('express');
const router = express.Router();
const { 
    getTemplates, createTemplate, updateTemplate, deleteTemplate, 
    getLogs, getSmtpSettings, updateSmtpSettings, testSmtpConnection 
} = require('../controllers/emailSettingsController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);
// Assuming Email Management is restricted to Super Admin or someone with specific Settings role
router.use(authorize('Super Admin'));

router.get('/templates', getTemplates);
router.post('/templates', createTemplate);
router.put('/templates/:id', updateTemplate);
router.delete('/templates/:id', deleteTemplate);
router.get('/logs', getLogs);
router.get('/smtp', getSmtpSettings);
router.post('/smtp', updateSmtpSettings);
router.post('/smtp/test', testSmtpConnection);

module.exports = router;
