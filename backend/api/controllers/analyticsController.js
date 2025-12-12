const analyticsModel = require('../models/analyticsModel');
const catchAsync = require('../utils/catchAsync');

exports.recordVisit = catchAsync(async (req, res) => {
    const { path } = req.body;
    const userId = req.user ? req.user.userId : null; // req.user.userId based on auth middleware
    const ip = req.ip;
    const userAgent = req.get('User-Agent');

    await analyticsModel.recordVisit(path, userId, ip, userAgent);
    res.status(200).json({ success: true });
});

exports.getAnalytics = catchAsync(async (req, res) => {
    const { days } = req.query;
    const visitStats = await analyticsModel.getVisitStats(days);
    const orderStats = await analyticsModel.getOrderStats(days);
    const clientStats = await analyticsModel.getClientStats();
    const sellerStats = await analyticsModel.getSellerStats();

    res.json({
        visits: visitStats,
        orders: orderStats,
        clients: clientStats,
        sellers: sellerStats
    });
});
