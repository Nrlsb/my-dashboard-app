const NodeCache = require('node-cache');

// stdTTL: tiempo de vida en segundos para cada registro. 600s = 10 minutos.
// checkperiod: cada cuántos segundos se revisan y eliminan los registros expirados. 120s = 2 minutos.
const permissionsCache = new NodeCache({ stdTTL: 600, checkperiod: 120 });

// Caché para datos que cambian más a menudo, como las ofertas. TTL de 2 minutos.
const offersCache = new NodeCache({ stdTTL: 120, checkperiod: 60 });

module.exports = {
    permissionsCache,
    offersCache,
};
