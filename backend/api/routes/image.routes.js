const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { uploadAndAnalyzeImage, assignImageToProducts } = require('../controllers/imageController');

// Configure multer for temporary local storage
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'temp/'); // Ensure this directory exists
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ storage: storage });

// Ensure temp directory exists
const fs = require('fs');
if (!fs.existsSync('temp')) {
    fs.mkdirSync('temp');
}

router.post('/upload', upload.array('images', 10), uploadAndAnalyzeImage);
router.post('/assign', assignImageToProducts);

module.exports = router;
