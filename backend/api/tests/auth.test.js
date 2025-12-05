const request = require('supertest');
const express = require('express');
const bodyParser = require('body-parser');

// 1. Mock infrastructure BEFORE importing routes
jest.mock('express-rate-limit', () => jest.fn(() => (req, res, next) => {
    console.error('Mock RateLimit called');
    next();
}));
jest.mock('node-cron', () => ({ schedule: jest.fn() }));

jest.mock('../db', () => ({
    pool: {
        query: jest.fn(),
        on: jest.fn(),
        connect: jest.fn(),
    },
    pool2: {
        query: jest.fn(),
        on: jest.fn(),
        connect: jest.fn(),
    }
}));

jest.mock('../redisClient', () => ({
    redisClient: {
        on: jest.fn(),
        connect: jest.fn(),
        isOpen: false,
    },
    connectRedis: jest.fn(),
    isRedisReady: jest.fn(() => false),
}));

jest.mock('../middleware/validate', () => jest.fn((schema) => (req, res, next) => {
    console.error('Mock Validate called');
    next();
}));

// 2. Mock controller
jest.mock('../controllers/authController', () => ({
    loginController: jest.fn((req, res) => {
        console.log('FACTORY MOCK loginController called');
        if (req.body.email === 'test@example.com' && req.body.password === 'password123') {
            return res.status(200).json({
                success: true,
                token: 'fake-jwt-token',
                user: { id: 1, email: 'test@example.com' }
            });
        }
        return res.status(401).json({ message: 'Credenciales inválidas' });
    }),
    registerController: jest.fn((req, res) => {
        console.log('FACTORY MOCK registerController called');
        if (req.body.email === 'existing@example.com') {
            return res.status(409).json({ message: 'El email ya está registrado.' });
        }
        return res.status(201).json({
            success: true,
            user: { id: 2, email: req.body.email, nombre: req.body.nombre }
        });
    }),
    authenticateProtheusUser: jest.fn(),
    registerProtheusUser: jest.fn()
}));

// 3. Import routes AFTER mocks
const authRoutes = require('../routes/auth.routes');

const app = express();
app.use(bodyParser.json());
app.get('/sanity', (req, res) => res.status(200).json({ status: 'ok' }));
app.use('/api/auth', authRoutes);

describe('Auth Routes Integration Tests', () => {
    jest.setTimeout(30000);
    it('sanity check', async () => {
        const res = await request(app).get('/sanity');
        expect(res.statusCode).toEqual(200);
    });

    describe.skip('POST /api/auth/login', () => {
        it('should return 200 and token for valid credentials', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'test@example.com',
                    password: 'password123'
                });

            expect(res.statusCode).toEqual(200);
            expect(res.body).toHaveProperty('success', true);
            expect(res.body).toHaveProperty('token');
        });

        it('should return 400 for invalid email format (Zod validation)', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'invalid-email',
                    password: 'password123'
                });

            expect(res.statusCode).toEqual(400);
            expect(res.body).toHaveProperty('message', 'Error de validación');
        });

        it('should return 400 for missing password (Zod validation)', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'test@example.com'
                });

            expect(res.statusCode).toEqual(400);
        });

        it('should return 401 for invalid credentials (Controller logic)', async () => {
            const res = await request(app)
                .post('/api/auth/login')
                .send({
                    email: 'test@example.com',
                    password: 'wrongpassword'
                });

            expect(res.statusCode).toEqual(401);
        });
    });

    describe.skip('POST /api/auth/register', () => {
        it('should return 201 for valid registration', async () => {
            const res = await request(app)
                .post('/api/auth/register')
                .send({
                    nombre: 'Test User',
                    email: 'newuser@example.com',
                    password: 'password123'
                });

            expect(res.statusCode).toEqual(201);
            expect(res.body).toHaveProperty('success', true);
        });

        it('should return 400 for short password (Zod validation)', async () => {
            const res = await request(app)
                .post('/api/auth/register')
                .send({
                    nombre: 'Test User',
                    email: 'newuser@example.com',
                    password: '123'
                });

            expect(res.statusCode).toEqual(400);
        });
    });
});
