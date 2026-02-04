const { pool, pool2 } = require('../db');
const logger = require('../utils/logger');

const getDateFilter = (startDate, endDate) => {
    if (startDate && endDate) {
        return {
            condition: "created_at >= $1::timestamp AND created_at < ($2::date + INTERVAL '1 day')",
            params: [startDate, endDate]
        };
    }
    return {
        condition: "created_at >= NOW() - INTERVAL '30 days'",
        params: []
    };
};

const ensurePageVisitsTable = async () => {
    const query = `
      CREATE TABLE IF NOT EXISTS page_visits (
        id SERIAL PRIMARY KEY,
        path VARCHAR(255) NOT NULL,
        user_id INTEGER,
        ip_address VARCHAR(50),
        user_agent TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        user_role VARCHAR(50) DEFAULT 'cliente'
      );
    `;
    try {
        await pool2.query(query);
        try {
            await pool2.query("ALTER TABLE page_visits ADD COLUMN IF NOT EXISTS user_role VARCHAR(50) DEFAULT 'cliente';");
        } catch (e) {
            // Ignore if column exists
        }
    } catch (error) {
        console.error('Error ensuring page_visits table:', error);
    }
};

// Initialize table
ensurePageVisitsTable();

const ensurePriceListDownloadsTable = async () => {
    const query = `
      CREATE TABLE IF NOT EXISTS price_list_downloads (
        id SERIAL PRIMARY KEY,
        user_id INTEGER,
        filters JSONB,
        format VARCHAR(20),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        ip_address VARCHAR(50),
        user_agent TEXT
      );
    `;
    try {
        await pool2.query(query);
    } catch (error) {
        console.error('Error ensuring price_list_downloads table:', error);
    }
};

ensurePriceListDownloadsTable();

const recordVisit = async (path, userId, ip, userAgent, userRole = 'cliente') => {
    try {
        const query = `
      INSERT INTO page_visits (path, user_id, ip_address, user_agent, user_role)
      VALUES ($1, $2, $3, $4, $5)
    `;
        await pool2.query(query, [path, userId, ip, userAgent, userRole]);
    } catch (error) {
        console.error('Error recording visit:', error);
    }
};

const recordPriceListDownload = async (userId, filters, format, ip, userAgent) => {
    try {
        const query = `
            INSERT INTO price_list_downloads (user_id, filters, format, ip_address, user_agent)
            VALUES ($1, $2, $3, $4, $5)
        `;
        await pool2.query(query, [userId, filters, format, ip, userAgent]);
    } catch (error) {
        console.error('Error recording price list download:', error);
    }
};

const getVisitStats = async (startDate, endDate) => {
    try {
        const filter = getDateFilter(startDate, endDate);
        const query = `
      SELECT 
        TO_CHAR(created_at, 'YYYY-MM-DD') as date,
        COUNT(*) as count
      FROM page_visits
      WHERE ${filter.condition}
      GROUP BY date
      ORDER BY date ASC
    `;
        const result = await pool2.query(query, filter.params);
        return result.rows;
    } catch (error) {
        console.error('Error getting visit stats:', error);
        return [];
    }
};

const getOrderStats = async (startDate, endDate) => {
    try {
        const filter = getDateFilter(startDate, endDate);
        const query = `
      SELECT 
        TO_CHAR(created_at, 'YYYY-MM-DD') as date,
        COUNT(*) as count,
        SUM(CASE WHEN is_confirmed = true THEN 1 ELSE 0 END) as confirmed_count,
        SUM(total) as total_amount
      FROM orders
      WHERE ${filter.condition}
      GROUP BY date
      ORDER BY date ASC
    `;
        const result = await pool2.query(query, filter.params);
        return result.rows;
    } catch (error) {
        console.error('Error getting order stats:', error);
        return [];
    }
};

const getClientStats = async (startDate, endDate) => {
    try {
        const filter = getDateFilter(startDate, endDate);

        // 1. Get total clients (non-admin)
        const totalClientsQuery = `SELECT COUNT(*) FROM users WHERE is_admin = false`;
        const totalClientsResult = await pool.query(totalClientsQuery);

        // 2. Get top clients by spend in date range
        const topClientsQuery = `
            SELECT user_id, COUNT(*) as order_count, SUM(total) as total_spent
            FROM orders
            WHERE ${filter.condition}
            GROUP BY user_id
            ORDER BY total_spent DESC
            LIMIT 10
        `;
        const topClientsResult = await pool2.query(topClientsQuery, filter.params);
        const topClientIds = topClientsResult.rows.map(r => r.user_id);

        let topClients = [];
        if (topClientIds.length > 0) {
            // Fetch user details
            const usersQuery = `SELECT id, full_name, email FROM users WHERE id = ANY($1::int[])`;
            const usersResult = await pool.query(usersQuery, [topClientIds]);
            const userMap = new Map(usersResult.rows.map(u => [u.id, u]));

            // Fetch extra metrics for each client
            for (const row of topClientsResult.rows) {
                const userId = row.user_id;

                // Most Viewed Product
                let mostViewed = 'N/A';
                try {
                    // Prepare params and condition for subqueries
                    const viewParams = [userId, ...filter.params];
                    let viewCondition = filter.condition;

                    if (filter.params.length > 0) {
                        viewCondition = viewCondition.replace(/\$2/g, '$3').replace(/\$1/g, '$2');
                    }

                    const viewsQuery = `
                        SELECT SUBSTRING(path FROM '/product-detail/([0-9]+)')::int as product_id, COUNT(*) as count
                        FROM page_visits
                        WHERE user_id = $1 AND path LIKE '/product-detail/%' AND ${viewCondition}
                        GROUP BY product_id
                        ORDER BY count DESC
                        LIMIT 1
                    `;

                    const viewsResult = await pool2.query(viewsQuery, viewParams);

                    if (viewsResult.rows.length > 0) {
                        const pid = viewsResult.rows[0].product_id;
                        if (pid) {
                            const pRes = await pool.query('SELECT b1_desc FROM products WHERE id = $1', [pid]);
                            if (pRes.rows.length > 0) mostViewed = pRes.rows[0].b1_desc;
                        }
                    }
                } catch (err) {
                    console.error(`Error fetching most viewed for user ${userId}:`, err.message);
                }

                // Most Bought Product
                let mostBought = 'N/A';
                try {
                    const viewParams = [userId, ...filter.params];
                    let viewCondition = filter.condition;

                    if (filter.params.length > 0) {
                        viewCondition = viewCondition.replace(/\$2/g, '$3').replace(/\$1/g, '$2');
                    }

                    const boughtCondition = viewCondition.replace(/created_at/g, 'o.created_at');

                    const boughtQuery = `
                        SELECT oi.product_id, SUM(oi.quantity) as qty
                        FROM order_items oi
                        JOIN orders o ON o.id = oi.order_id
                        WHERE o.user_id = $1 AND ${boughtCondition}
                        GROUP BY oi.product_id
                        ORDER BY qty DESC
                        LIMIT 1
                    `;
                    const boughtResult = await pool2.query(boughtQuery, viewParams);

                    if (boughtResult.rows.length > 0) {
                        const pid = boughtResult.rows[0].product_id;
                        if (pid) {
                            const pRes = await pool.query('SELECT b1_desc FROM products WHERE id = $1', [pid]);
                            if (pRes.rows.length > 0) mostBought = pRes.rows[0].b1_desc;
                        }
                    }
                } catch (err) {
                    console.error(`Error fetching most bought for user ${userId}:`, err.message);
                }

                topClients.push({
                    ...row,
                    user: userMap.get(userId) || { full_name: 'Unknown', email: '' },
                    mostViewedProduct: mostViewed,
                    mostBoughtProduct: mostBought
                });
            }
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

const getSellerStats = async (startDate, endDate) => {
    try {
        const filter = getDateFilter(startDate, endDate);

        // 1. Get all users and their seller codes
        const usersQuery = `SELECT id, vendedor_codigo FROM users WHERE vendedor_codigo IS NOT NULL AND vendedor_codigo != ''`;
        const usersResult = await pool.query(usersQuery);
        const userSellerMap = new Map(usersResult.rows.map(u => [u.id, u.vendedor_codigo]));

        // Map seller code -> list of user IDs
        const sellerUsersMap = {};
        usersResult.rows.forEach(u => {
            if (!sellerUsersMap[u.vendedor_codigo]) sellerUsersMap[u.vendedor_codigo] = [];
            sellerUsersMap[u.vendedor_codigo].push(u.id);
        });

        // 2. Get aggregated orders by user_id
        const ordersQuery = `
            SELECT 
                user_id, 
                COUNT(*) as count, 
                SUM(CASE WHEN is_confirmed = true THEN 1 ELSE 0 END) as confirmed_count,
                SUM(total) as total 
            FROM orders 
            WHERE ${filter.condition}
            GROUP BY user_id
        `;
        const ordersResult = await pool2.query(ordersQuery, filter.params);

        // 3. Get aggregated visits by user_id
        const visitsQuery = `
            SELECT user_id, COUNT(*) as count
            FROM page_visits
            WHERE ${filter.condition}
            GROUP BY user_id
        `;
        const visitsResult = await pool2.query(visitsQuery, filter.params);
        const userVisitsMap = new Map(visitsResult.rows.map(v => [v.user_id, parseInt(v.count, 10)]));

        const sellerStats = {};
        const sellerCodes = new Set();

        // Process Orders
        ordersResult.rows.forEach(order => {
            const sellerCode = userSellerMap.get(order.user_id);
            if (sellerCode) {
                if (!sellerStats[sellerCode]) {
                    sellerStats[sellerCode] = {
                        code: sellerCode,
                        orderCount: 0,
                        confirmedOrderCount: 0,
                        totalSales: 0,
                        visitCount: 0,
                        name: sellerCode
                    };
                    sellerCodes.add(sellerCode);
                }
                sellerStats[sellerCode].orderCount += parseInt(order.count, 10);
                sellerStats[sellerCode].confirmedOrderCount += parseInt(order.confirmed_count, 10);
                sellerStats[sellerCode].totalSales += parseFloat(order.total);
            }
        });

        // Process Visits (iterate through all seller users, as they might have visits but no orders)
        for (const [code, userIds] of Object.entries(sellerUsersMap)) {
            if (!sellerStats[code]) {
                sellerStats[code] = {
                    code: code,
                    orderCount: 0,
                    confirmedOrderCount: 0,
                    totalSales: 0,
                    visitCount: 0,
                    name: code
                };
                sellerCodes.add(code);
            }
            userIds.forEach(uid => {
                sellerStats[code].visitCount += userVisitsMap.get(uid) || 0;
            });
        }

        // 4. Fetch seller names
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

const getTestUserStats = async (userId) => {
    try {
        // 1. Total Visits
        const countQuery = `
            SELECT COUNT(*) 
            FROM page_visits 
            WHERE user_id = $1 AND user_role = 'test_user'
        `;
        const countResult = await pool2.query(countQuery, [userId]);
        const totalVisits = parseInt(countResult.rows[0].count, 10);

        // 2. Last Visit
        const lastVisitQuery = `
            SELECT created_at 
            FROM page_visits 
            WHERE user_id = $1 AND user_role = 'test_user'
            ORDER BY created_at DESC 
            LIMIT 1
        `;
        const lastVisitResult = await pool2.query(lastVisitQuery, [userId]);
        const lastVisit = lastVisitResult.rows.length > 0 ? lastVisitResult.rows[0].created_at : null;

        // 3. Top Pages
        const topPagesQuery = `
            SELECT path, COUNT(*) as count
            FROM page_visits
            WHERE user_id = $1 AND user_role = 'test_user'
            GROUP BY path
            ORDER BY count DESC
            LIMIT 5
        `;
        const topPagesResult = await pool2.query(topPagesQuery, [userId]);

        return {
            totalVisits,
            lastVisit,
            topPages: topPagesResult.rows
        };
    } catch (error) {
        console.error('Error getting test user stats:', error);
        return { totalVisits: 0, lastVisit: null, topPages: [] };
    }
};

const getUserStats = async (userId) => {
    try {
        logger.info(`[DEBUG] analyticsModel.getUserStats processing userId: ${userId}`);

        // 0. Get User Details (for ID display)
        // We join with vendedores to see if this user is a vendor and get their code
        const userQuery = `
            SELECT u.a1_cod
            FROM users u
            WHERE u.id = $1
        `;
        const userResult = await pool2.query(userQuery, [userId]);
        const user = userResult.rows[0] || {};

        if (!userResult.rows[0]) {
            logger.warn(`[DEBUG] No user found for userId: ${userId}`);
        } else {
            logger.info(`[DEBUG] User found: ${JSON.stringify(user)}`);
        }

        // 1. Total Visits
        const countQuery = `
            SELECT COUNT(*) 
            FROM page_visits 
            WHERE user_id = $1
        `;
        const countResult = await pool2.query(countQuery, [userId]);
        const totalVisits = parseInt(countResult.rows[0].count, 10);
        logger.info(`[DEBUG] Total visits for userId ${userId}: ${totalVisits}`);

        // 2. Last Visit
        const lastVisitQuery = `
            SELECT created_at 
            FROM page_visits 
            WHERE user_id = $1
            ORDER BY created_at DESC 
            LIMIT 1
        `;
        const lastVisitResult = await pool2.query(lastVisitQuery, [userId]);
        const lastVisit = lastVisitResult.rows.length > 0 ? lastVisitResult.rows[0].created_at : null;

        // 3. Top Pages
        const topPagesQuery = `
            SELECT path, COUNT(*) as count
            FROM page_visits
            WHERE user_id = $1
            GROUP BY path
            ORDER BY count DESC
            LIMIT 5
        `;
        const topPagesResult = await pool2.query(topPagesQuery, [userId]);

        // 4. Download History
        let downloads = [];
        try {
            const downloadsQuery = `
                SELECT created_at, filters, format
                FROM price_list_downloads
                WHERE user_id = $1
                ORDER BY created_at DESC
                LIMIT 10
            `;
            const downloadsResult = await pool2.query(downloadsQuery, [userId]);
            downloads = downloadsResult.rows;
        } catch (e) {
            logger.error('Error fetching downloads history:', e);
            // Ignore if table doesn't exist yet or other error, return empty
        }

        return {
            totalVisits,
            lastVisit,
            topPages: topPagesResult.rows,
            downloads,
            a1_cod: user.a1_cod,
            codigo: user.vendor_code
        };
    } catch (error) {
        logger.error(`Error getting user stats for userId ${userId}:`, error);
        return { totalVisits: 0, lastVisit: null, topPages: [], downloads: [], a1_cod: null, codigo: null };
    }
};

module.exports = {
    recordVisit,
    getVisitStats,
    getOrderStats,
    getClientStats,
    getSellerStats,
    getTestUserStats,
    getUserStats,
    recordPriceListDownload
};
