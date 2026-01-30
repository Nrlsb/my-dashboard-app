const cartModel = require('../models/cartModel');

const getCart = async (req, res) => {
    try {
        const userId = req.user.userId;
        const items = await cartModel.getCartByUserId(userId);
        res.json(items);
    } catch (error) {
        console.error('Error in getCart controller:', error);
        res.status(500).json({ message: 'Error fetching cart' });
    }
};

const updateCart = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { items } = req.body;

        if (!Array.isArray(items)) {
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
