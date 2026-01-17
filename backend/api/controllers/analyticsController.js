const analyticsModel = require('../models/analyticsModel');
const catchAsync = require('../utils/catchAsync');

exports.recordVisit = catchAsync(async (req, res) => {
    const { path } = req.body;
    const userId = req.user ? req.user.userId : null;
    const userRole = req.user ? (req.user.role || 'cliente') : 'cliente';
    const ip = req.ip;
    const userAgent = req.get('User-Agent');

    await analyticsModel.recordVisit(path, userId, ip, userAgent, userRole);
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

exports.getUserAnalytics = catchAsync(async (req, res) => {
    const { userId } = req.params;
    const stats = await analyticsModel.getUserStats(userId);
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
