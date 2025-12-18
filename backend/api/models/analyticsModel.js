const { pool, pool2 } = require('../db');

const recordVisit = async (path, userId, ip, userAgent) => {
    try {
        const query = `
      INSERT INTO page_visits (path, user_id, ip_address, user_agent)
      VALUES ($1, $2, $3, $4)
    `;
        await pool2.query(query, [path, userId, ip, userAgent]);
    } catch (error) {
        console.error('Error recording visit:', error);
    }
};

const getVisitStats = async (days = 30) => {
    try {
        const query = `
      SELECT 
        TO_CHAR(created_at, 'YYYY-MM-DD') as date,
        COUNT(*) as count
      FROM page_visits
      WHERE created_at >= NOW() - INTERVAL '${days} days'
      GROUP BY date
      ORDER BY date ASC
    `;
        const result = await pool2.query(query);
        return result.rows;
    } catch (error) {
        console.error('Error getting visit stats:', error);
        return [];
    }
};

const getOrderStats = async (days = 30) => {
    try {
        const query = `
      SELECT 
        TO_CHAR(created_at, 'YYYY-MM-DD') as date,
        COUNT(*) as count,
        SUM(total) as total_amount
      FROM orders
      WHERE created_at >= NOW() - INTERVAL '${days} days'
      GROUP BY date
      ORDER BY date ASC
    `;
        const result = await pool2.query(query);
        return result.rows;
    } catch (error) {
        console.error('Error getting order stats:', error);
        return [];
    }
};

const getClientStats = async () => {
    try {
        const totalClientsQuery = `SELECT COUNT(*) FROM users WHERE is_admin = false`;
        const totalClientsResult = await pool.query(totalClientsQuery);

        const topClientsQuery = `
            SELECT user_id, COUNT(*) as order_count, SUM(total) as total_spent
            FROM orders
            GROUP BY user_id
            ORDER BY total_spent DESC
            LIMIT 10
        `;
        const topClientsResult = await pool2.query(topClientsQuery);

        const topClientIds = topClientsResult.rows.map(r => r.user_id);

        let topClients = [];
        if (topClientIds.length > 0) {
            const usersQuery = `SELECT id, full_name, email FROM users WHERE id = ANY($1::int[])`;
            const usersResult = await pool.query(usersQuery, [topClientIds]);

            const userMap = new Map(usersResult.rows.map(u => [u.id, u]));

            topClients = topClientsResult.rows.map(r => ({
                ...r,
                user: userMap.get(r.user_id) || { full_name: 'Unknown', email: '' }
            }));
        }

        return {
            totalClients: parseInt(totalClientsResult.rows[0].count, 10),
            topClients
        };

    } catch (error) {
        console.error('Error getting client stats:', error);
        return { totalClients: 0, topClients: [] };
    }
}

const getSellerStats = async () => {
    try {
        // 1. Get all users and their seller codes (clients who have a seller assigned)
        const usersQuery = `SELECT id, vendedor_codigo FROM users WHERE vendedor_codigo IS NOT NULL`;
        const usersResult = await pool.query(usersQuery);
        const userSellerMap = new Map(usersResult.rows.map(u => [u.id, u.vendedor_codigo]));

        // 2. Get aggregated orders by user_id
        const ordersQuery = `SELECT user_id, COUNT(*) as count, SUM(total) as total FROM orders GROUP BY user_id`;
        const ordersResult = await pool2.query(ordersQuery);

        const sellerStats = {};
        const sellerCodes = new Set();

        ordersResult.rows.forEach(order => {
            const sellerCode = userSellerMap.get(order.user_id);
            if (sellerCode) {
                if (!sellerStats[sellerCode]) {
                    sellerStats[sellerCode] = { code: sellerCode, orderCount: 0, totalSales: 0, name: sellerCode }; // Default name to code
                    sellerCodes.add(sellerCode);
                }
                sellerStats[sellerCode].orderCount += parseInt(order.count, 10);
                sellerStats[sellerCode].totalSales += parseFloat(order.total);
            }
        });

        // 3. Fetch seller names from vendedores table
        if (sellerCodes.size > 0) {
            const codesArray = Array.from(sellerCodes);
            const sellersQuery = `SELECT codigo, nombre FROM vendedores WHERE codigo = ANY($1::varchar[])`;
            const sellersResult = await pool.query(sellersQuery, [codesArray]);

            sellersResult.rows.forEach(seller => {
                if (sellerStats[seller.codigo]) {
                    sellerStats[seller.codigo].name = seller.nombre;
                }
            });
        }

        return Object.values(sellerStats).sort((a, b) => b.totalSales - a.totalSales);

    } catch (error) {
        console.error('Error getting seller stats:', error);
        return [];
    }
}

module.exports = {
    recordVisit,
    getVisitStats,
    getOrderStats,
    getClientStats,
    getSellerStats
};
