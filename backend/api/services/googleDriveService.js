const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');
const logger = require('../utils/logger'); // Assuming a logger exists, otherwise console

const SCOPES = ['https://www.googleapis.com/auth/drive.file'];
const TOKEN_PATH = path.join(__dirname, '../token.json');
const CREDENTIALS_PATH = path.join(__dirname, '../oauth_credentials.json'); // Updated to use correct OAuth file

/**
 * Load credentials and authorize client.
 */
const authorize = async () => {
    try {
        let credentials;

        // 1. Load Credentials (try File first, then Env Var)
        if (fs.existsSync(CREDENTIALS_PATH)) {
            const content = fs.readFileSync(CREDENTIALS_PATH);
            credentials = JSON.parse(content);
        } else if (process.env.GOOGLE_CREDENTIALS) {
            // Support for Render/Production Env Vars
            console.log('Loading Google Credentials from Environment Variable...');
            credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS);
        } else {
            throw new Error(`Credentials not found. Checked ${CREDENTIALS_PATH} and GOOGLE_CREDENTIALS env var.`);
        }

        // Check if it is a Service Account
        if (credentials.type === 'service_account') {
            console.log('Using Service Account Credentials');
            const auth = new google.auth.GoogleAuth({
                credentials,
                scopes: SCOPES,
            });
            return auth.getClient();
        }

        // Otherwise, assume OAuth 2.0 Web/Installed Client
        const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;
        const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

        // 2. Load Token (try File first, then Env Var)
        let token;
        if (fs.existsSync(TOKEN_PATH)) {
            const tokenContent = fs.readFileSync(TOKEN_PATH);
            token = JSON.parse(tokenContent);
        } else if (process.env.GOOGLE_TOKEN) {
            // Support for Render/Production Env Vars
            console.log('Loading Google Token from Environment Variable...');
            token = JSON.parse(process.env.GOOGLE_TOKEN);
        } else {
            throw new Error('Token not found. Checked token.json and GOOGLE_TOKEN env var. Please authenticate locally first.');
        }

        try {
            oAuth2Client.setCredentials(token);
            return oAuth2Client;
        } catch (jsonError) {
            console.error('Error parsing token:', jsonError);
            throw new Error('Invalid token data');
        }

    } catch (error) {
        console.error('Error in authorize():', error);
        throw error;
    }
};

/**
 * Upload a file to Google Drive.
 * @param {object} file - The file object from multer (has path, mimetype, originalname).
 * @param {string} folderId - Optional folder ID to upload to.
 */
const uploadFile = async (file, folderId = null) => {
    const auth = await authorize();
    const drive = google.drive({ version: 'v3', auth });

    const fileMetadata = {
        name: file.originalname,
    };
    if (folderId) {
        fileMetadata.parents = [folderId];
    }

    const media = {
        mimeType: file.mimetype,
        body: fs.createReadStream(file.path),
    };

    try {
        const response = await drive.files.create({
            resource: fileMetadata,
            media: media,
            fields: 'id, webViewLink, webContentLink',
        });

        const fileId = response.data.id;

        // Set permissions to public (Viewer)
        await drive.permissions.create({
            fileId: fileId,
            requestBody: {
                role: 'reader',
                type: 'anyone',
            },
        });

        // Construct direct link (lh3 format is preferred for images)
        const directLink = `https://lh3.googleusercontent.com/d/${fileId}`;

        // Clean up local temp file
        if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
        }

        return {
            id: fileId,
            webViewLink: response.data.webViewLink,
            webContentLink: response.data.webContentLink,
            directLink: directLink
        };
    } catch (error) {
        console.error('Error uploading to Drive:', error);
        throw error;
    }
};



/**
 * Get a file stream from Google Drive.
 * @param {string} fileId - The ID of the file to download.
 * @returns {Promise<stream.Readable>} - The file stream.
 */
const getFileStream = async (fileId) => {
    const auth = await authorize();
    const drive = google.drive({ version: 'v3', auth });

    try {
        const response = await drive.files.get(
            { fileId: fileId, alt: 'media' },
            { responseType: 'stream' }
        );
        return response.data;
    } catch (error) {
        console.error('Error getting file stream from Drive:', error);
        throw error;
    }
};

module.exports = {
    uploadFile,
    getFileStream,
};
