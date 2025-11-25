const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configuración de Multer
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // 'uploads/' será relativo al directorio desde donde se ejecuta `node server.js`
    // que es `backend/api/`.
    // Creamos 'backend/api/uploads/' si no existe.
    const uploadDir = 'uploads/';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  },
});

const upload = multer({ storage: storage });

module.exports = { upload };
