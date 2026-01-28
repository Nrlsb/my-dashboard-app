const googleDriveService = require('../services/googleDriveService');
const catchAsync = require('../utils/catchAsync');

exports.uploadToDrive = catchAsync(async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded.' });
    }

    try {
        // "Products" folder ID could be configured in .env, for now optional or root
        // If you have a specific folder ID, load it from env: process.env.GOOGLE_DRIVE_FOLDER_ID
        console.log('Received file for Drive upload:', req.file);
        const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
        console.log('DEBUG: Uploading to Folder ID:', folderId ? folderId : 'UNDEFINED/NULL');

        if (!folderId) {
            console.warn('WARNING: No GOOGLE_DRIVE_FOLDER_ID found. Uploading to root (likely to fail for Service Accounts).');
        }

        const result = await googleDriveService.uploadFile(req.file, folderId);

        res.json({
            message: 'File uploaded successfully',
            imageUrl: result.directLink,
            fileId: result.id
        });
    } catch (error) {
        console.error('Upload controller error:', error);
        res.status(500).json({
            message: 'Error uploading to Google Drive',
            error: error.message,
            details: error.toString()
        });
    }
});
