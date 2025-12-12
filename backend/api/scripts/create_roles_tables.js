const { pool2 } = require('../db');

const createTables = async () => {
    const client = await pool2.connect();
    try {
        await client.query('BEGIN');

        console.log('Creating roles table...');
        await client.query(`
      CREATE TABLE IF NOT EXISTS roles (
        id SERIAL PRIMARY KEY,
        name VARCHAR(50) UNIQUE NOT NULL,
        permissions JSONB DEFAULT '[]'::jsonb,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

        console.log('Creating user_roles table...');
        await client.query(`
      CREATE TABLE IF NOT EXISTS user_roles (
        user_id INT NOT NULL,
        role_id INT REFERENCES roles(id) ON DELETE CASCADE,
        assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (user_id, role_id)
      );
    `);

        // Insert default roles
        console.log('Inserting default roles...');
        const adminRoleResult = await client.query(`
      INSERT INTO roles (name, permissions)
      VALUES ('admin', '["all"]')
      ON CONFLICT (name) DO UPDATE SET permissions = '["all"]'
      RETURNING id;
    `);
        const adminRoleId = adminRoleResult.rows[0].id;

        const marketingRoleResult = await client.query(`
      INSERT INTO roles (name, permissions)
      VALUES ('marketing', '["manage_content", "manage_offers"]')
      ON CONFLICT (name) DO NOTHING
      RETURNING id;
    `);

        let marketingRoleId;
        if (marketingRoleResult.rows.length > 0) {
            marketingRoleId = marketingRoleResult.rows[0].id;
        } else {
            const res = await client.query("SELECT id FROM roles WHERE name = 'marketing'");
            marketingRoleId = res.rows[0].id;
        }

        // Migrate existing admins
        console.log('Migrating existing admins...');
        const admins = await client.query('SELECT user_id FROM admins');
        for (const row of admins.rows) {
            await client.query(`
        INSERT INTO user_roles (user_id, role_id)
        VALUES ($1, $2)
        ON CONFLICT (user_id, role_id) DO NOTHING
      `, [row.user_id, adminRoleId]);
        }

        // Migrate existing marketing users
        console.log('Migrating existing marketing users...');
        const marketingUsers = await client.query('SELECT user_id FROM marketing_users');
        for (const row of marketingUsers.rows) {
            await client.query(`
        INSERT INTO user_roles (user_id, role_id)
        VALUES ($1, $2)
        ON CONFLICT (user_id, role_id) DO NOTHING
      `, [row.user_id, marketingRoleId]);
        }

        await client.query('COMMIT');
        console.log('Migration completed successfully.');
    } catch (error) {
        await client.query('ROLLBACK');
        console.error('Error creating tables:', error);
    } finally {
        client.release();
        // We need to close the pool to exit the script
        await pool2.end();
    }
};

createTables();
