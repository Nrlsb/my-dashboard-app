const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const uploadController = require('../controllers/uploadController');
const { authenticateToken } = require('../middleware/auth');

// Configure multer for temp storage
const upload = multer({
    dest: path.join(__dirname, '../temp/'),
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// POST /api/upload/drive
// Protect with auth middleware if needed
router.post('/drive', authenticateToken, upload.single('image'), uploadController.uploadToDrive);

module.exports = router;
