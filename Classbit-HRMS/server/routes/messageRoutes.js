const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { sendMessage, getInbox, getOutbox, getConversation, getDepartmentConversation, getChatGroups, createChatGroup, getGroupConversation, markAsRead } = require('../controllers/messageController');
const { protect } = require('../middleware/authMiddleware');

// Ensure uploads/messages directory exists before multer tries to write to it
const uploadDir = path.join(__dirname, '..', 'uploads', 'messages');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.memoryStorage();

// Allow common file types — images, PDFs, docs, zip
const fileFilter = (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp|pdf|doc|docx|xls|xlsx|txt|zip|rar/;
    const ext = path.extname(file.originalname).toLowerCase().replace('.', '');
    if (allowed.test(ext)) {
        cb(null, true);
    } else {
        cb(new Error(`File type .${ext} not allowed`), false);
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 10 * 1024 * 1024 } // 10 MB limit
});

router.use(protect);

router.post('/', upload.single('attachment'), sendMessage);
router.get('/inbox', getInbox);
router.get('/outbox', getOutbox);
router.get('/groups', getChatGroups);
router.post('/groups', createChatGroup);
router.get('/groups/:groupId', getGroupConversation);
router.get('/department/:departmentId', getDepartmentConversation);
router.get('/:recipientId', getConversation);
router.patch('/:id/read', markAsRead);

module.exports = router;
