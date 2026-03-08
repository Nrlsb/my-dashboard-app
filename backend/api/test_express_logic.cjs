const express = require('express');
const app = express();

const router1 = express.Router();
router1.use((req, res, next) => {
    console.log('Router 1 Middleware executing for:', req.url);
    if (req.url === '/product') {
        console.log('Router 1 DETECTED /product and is about to decide...');
    }
    // authenticateToken in user.routes.js would do this if no token:
    return res.status(401).json({ message: 'Unauthorized from Router 1' });
});

const router2 = express.Router();
router2.get('/product', (req, res) => res.send('Product Success!'));

app.use('/', router1);
app.use('/api', router2);

const server = app.listen(0, () => {
    const port = server.address().port;
    console.log(`Test server running on port ${port}`);

    // Using a dynamic import for fetch or just using a simple http request
    const http = require('http');
    http.get(`http://localhost:${port}/api/product`, (res) => {
        console.log(`Response Status: ${res.statusCode}`);
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
            console.log(`Response Body: ${data}`);
            process.exit(res.statusCode === 401 ? 0 : 1);
        });
    });
});
