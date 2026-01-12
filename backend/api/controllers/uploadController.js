const googleDriveService = require('../services/googleDriveService');
const catchAsync = require('../utils/catchAsync');

exports.uploadToDrive = catchAsync(async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded.' });
    }

    try {
        // "Products" folder ID could be configured in .env, for now optional or root
        // If you have a specific folder ID, load it from env: process.env.DRIVE_PRODUCT_FOLDER_ID
        console.log('Received file for Drive upload:', req.file);
        const result = await googleDriveService.uploadFile(req.file);

        res.json({
            message: 'File uploaded successfully',
            imageUrl: result.directLink,
            fileId: result.id
        });
    } catch (error) {
        console.error('Upload controller error:', error);
        res.status(500).json({ message: 'Error uploading to Google Drive', error: error.message });
    }
});
