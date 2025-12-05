const AppError = require('../utils/appError');
const logger = require('../utils/logger');

const handleCastErrorDB = (err) => {
    const message = `Invalid ${err.path}: ${err.value}.`;
    return new AppError(message, 400);
};

const handleDuplicateFieldsDB = (err) => {
    // Regex to extract the duplicate value (works for some DBs, adjust for Postgres if needed)
    // Postgres duplicate key error usually comes with detail
    const value = err.detail ? err.detail.match(/\(([^)]+)\)/)[1] : 'unknown';
    const message = `Duplicate field value: ${value}. Please use another value!`;
    return new AppError(message, 400);
};

const handleValidationErrorDB = (err) => {
    // Adjust based on your ORM or validation library (e.g., Sequelize, Mongoose, Zod)
    // Assuming Zod or similar might pass an array of errors
    const errors = Object.values(err.errors).map((el) => el.message);
    const message = `Invalid input data. ${errors.join('. ')}`;
    return new AppError(message, 400);
};

const handleJWTError = () =>
    new AppError('Invalid token. Please log in again!', 401);

const handleJWTExpiredError = () =>
    new AppError('Your token has expired! Please log in again.', 401);

const sendErrorDev = (err, res) => {
    logger.error('ERROR 💥', err);
    res.status(err.statusCode).json({
        status: err.status,
        error: err,
        message: err.message,
        stack: err.stack,
    });
};

const sendErrorProd = (err, res) => {
    // Operational, trusted error: send message to client
    if (err.isOperational) {
        res.status(err.statusCode).json({
            status: err.status,
            message: err.message,
            code: err.code || 'ERROR', // Optional: Add specific error codes if available
        });

        // Programming or other unknown error: don't leak error details
    } else {
        // 1) Log error
        logger.error('ERROR 💥', err);

        // 2) Send generic message
        res.status(500).json({
            status: 'error',
            message: 'Something went very wrong!',
        });
    }
};

module.exports = (err, req, res, next) => {
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';

    if (process.env.NODE_ENV === 'development') {
        sendErrorDev(err, res);
    } else {
        let error = { ...err };
        error.message = err.message;

        // Postgres specific error codes
        if (error.code === '23505') error = handleDuplicateFieldsDB(error); // unique_violation
        if (error.code === '22P02') error = handleCastErrorDB(error); // invalid_text_representation
        if (error.name === 'JsonWebTokenError') error = handleJWTError();
        if (error.name === 'TokenExpiredError') error = handleJWTExpiredError();
        // Add more handlers as needed (e.g. validation errors from Zod)

        sendErrorProd(error, res);
    }
};
