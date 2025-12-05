// Configuración global para los tests
const logger = require('../utils/logger');

// Silenciar logs durante los tests para mantener la salida limpia
beforeAll(() => {
    logger.transports.forEach((t) => (t.silent = true));
});

afterAll(() => {
    logger.transports.forEach((t) => (t.silent = false));
});
