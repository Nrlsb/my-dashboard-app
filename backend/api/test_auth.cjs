const jwt = require('jsonwebtoken');
const { optionalAuthenticateToken } = require('./middleware/auth');
require('dotenv').config();

// Mock req, res, next
const req = { headers: {} };
const res = {
    status: (s) => { console.log('Status set to:', s); return res; },
    json: (j) => { console.log('JSON sent:', j); return res; }
};
const next = () => { console.log('Next called. req.user:', req.user); };

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret';

console.log('--- Test 1: No token ---');
req.headers['authorization'] = undefined;
optionalAuthenticateToken(req, res, next);

console.log('\n--- Test 2: Invalid token ---');
req.headers['authorization'] = 'Bearer invalid_token';
optionalAuthenticateToken(req, res, next);

console.log('\n--- Test 3: Valid token ---');
const token = jwt.sign({ userId: 123 }, process.env.JWT_SECRET);
req.headers['authorization'] = `Bearer ${token}`;
optionalAuthenticateToken(req, res, next);
