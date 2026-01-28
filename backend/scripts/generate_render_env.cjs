const fs = require('fs');
const path = require('path');

const credentialsPath = path.join(__dirname, '../api/oauth_credentials.json');
const tokenPath = path.join(__dirname, '../api/token.json');

console.log('--- COPIAR DESDE AQUI ---');
console.log('');

try {
    if (fs.existsSync(credentialsPath)) {
        const credentials = fs.readFileSync(credentialsPath, 'utf8');
        // Minify by parsing and stringifying
        const minifiedCredentials = JSON.stringify(JSON.parse(credentials));
        console.log('CLAVE: GOOGLE_CREDENTIALS');
        console.log('VALOR:');
        console.log(minifiedCredentials);
        console.log('');
    } else {
        console.error('ERROR: No se encontró api/oauth_credentials.json');
    }

    if (fs.existsSync(tokenPath)) {
        const token = fs.readFileSync(tokenPath, 'utf8');
        // Minify by parsing and stringifying
        const minifiedToken = JSON.stringify(JSON.parse(token));
        console.log('CLAVE: GOOGLE_TOKEN');
        console.log('VALOR:');
        console.log(minifiedToken);
        console.log('');
    } else {
        console.error('ERROR: No se encontró api/token.json');
    }

} catch (error) {
    console.error('Error generando variables:', error);
}

console.log('--- HASTA AQUI ---');
