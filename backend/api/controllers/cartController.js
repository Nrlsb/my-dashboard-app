const cartModel = require('../models/cartModel');

const getCart = async (req, res) => {
    try {
        const userId = req.user.userId;
        console.log(`[DEBUG] getCart called for userId: ${userId}`);

        const items = await cartModel.getCartByUserId(userId);
        console.log(`[DEBUG] getCart returning ${items ? items.length : 0} items for userId: ${userId}`);

        res.json(items);
    } catch (error) {
        console.error('Error in getCart controller:', error);
        res.status(500).json({ message: 'Error fetching cart' });
    }
};

const updateCart = async (req, res) => {
    try {
        console.log('[DEBUG] updateCart called. Body items length:', req.body.items ? req.body.items.length : 'undefined');
        console.log('[DEBUG] req.user:', JSON.stringify(req.user));

        const userId = req.user ? req.user.userId : undefined;
        console.log('[DEBUG] Extracted userId:', userId);

        if (!userId) {
            console.error('[ERROR] User ID is undefined', req.user);
            return res.status(401).json({ message: 'User ID missing from token' });
        }

        const { items } = req.body;

        if (!Array.isArray(items)) {
            console.error('[ERROR] Items is not an array:', items);
            return res.status(400).json({ message: 'Items must be an array' });
        }

        await cartModel.upsertCart(userId, items);
        res.json({ success: true, message: 'Cart updated' });
    } catch (error) {
        console.error('Error in updateCart controller:', error);
        res.status(500).json({ message: 'Error updating cart' });
    }
};

module.exports = {
    getCart,
    updateCart,
};
