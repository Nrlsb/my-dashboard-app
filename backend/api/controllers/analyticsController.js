const analyticsModel = require('../models/analyticsModel');
const catchAsync = require('../utils/catchAsync');

exports.recordVisit = catchAsync(async (req, res) => {
    const { path } = req.body;
    let userId = req.user ? req.user.userId : null;
    const userRole = req.user ? (req.user.role || 'cliente') : 'cliente';
    const ip = req.ip;
    const userAgent = req.get('User-Agent');

    // Ensure userId is an integer. If it's a vendor code (string), set to null for page_visits (which expects int).
    // Or try to parse it if it looks like an int.
    if (userId && isNaN(parseInt(userId))) {
        // If it's not a number (e.g. "V001"), set to null to avoid DB crash
        userId = null;
    } else if (userId) {
        userId = parseInt(userId);
    }

    await analyticsModel.recordVisit(path, userId, ip, userAgent, userRole);
    res.status(200).json({ success: true });
});

exports.recordDownload = catchAsync(async (req, res) => {
    const { filters, format } = req.body;
    let userId = req.user ? req.user.userId : null;

    // Ensure userId is integer for this table
    if (userId && isNaN(parseInt(userId))) {
        userId = null;
    } else if (userId) {
        userId = parseInt(userId);
    }

    const ip = req.ip;
    const userAgent = req.get('User-Agent');

    await analyticsModel.recordPriceListDownload(userId, filters, format, ip, userAgent);
    res.status(200).json({ success: true });
});

exports.getTestUserAnalytics = catchAsync(async (req, res) => {
    const { id } = req.params;
    const stats = await analyticsModel.getTestUserStats(id);
    res.json({
        status: 'success',
        data: stats
    });
});

const logger = require('../utils/logger');

exports.getUserAnalytics = catchAsync(async (req, res) => {
    const { userId } = req.params;
    logger.info(`[DEBUG] getUserAnalytics called for userId: ${userId} (${typeof userId})`);
    const stats = await analyticsModel.getUserStats(userId);
    logger.info(`[DEBUG] stats returned for ${userId}: ${JSON.stringify(stats)}`);
    res.json({
        status: 'success',
        data: stats
    });
});

exports.getAnalytics = catchAsync(async (req, res) => {
    const { startDate, endDate } = req.query;

    // Pass date range to all stats functions
    const visitStats = await analyticsModel.getVisitStats(startDate, endDate);
    const orderStats = await analyticsModel.getOrderStats(startDate, endDate);
    const clientStats = await analyticsModel.getClientStats(startDate, endDate);
    const sellerStats = await analyticsModel.getSellerStats(startDate, endDate);

    res.json({
        visits: visitStats,
        orders: orderStats,
        clients: clientStats,
        sellers: sellerStats
    });
});
