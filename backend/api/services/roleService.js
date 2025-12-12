const { pool, pool2 } = require('../db');

/**
 * Obtiene todos los roles disponibles.
 */
const getRoles = async () => {
    try {
        const result = await pool2.query('SELECT * FROM roles ORDER BY id ASC');
        return result.rows;
    } catch (error) {
        console.error('Error en getRoles:', error);
        throw error;
    }
};

/**
 * Crea un nuevo rol.
 */
const createRole = async (name, permissions) => {
    try {
        const result = await pool2.query(
            'INSERT INTO roles (name, permissions) VALUES ($1, $2) RETURNING *',
            [name, JSON.stringify(permissions)]
        );
        return result.rows[0];
    } catch (error) {
        console.error('Error en createRole:', error);
        throw error;
    }
};

/**
 * Actualiza un rol existente.
 */
const updateRole = async (id, name, permissions) => {
    try {
        const result = await pool2.query(
            'UPDATE roles SET name = $1, permissions = $2 WHERE id = $3 RETURNING *',
            [name, JSON.stringify(permissions), id]
        );
        return result.rows[0];
    } catch (error) {
        console.error('Error en updateRole:', error);
        throw error;
    }
};

/**
 * Elimina un rol.
 */
const deleteRole = async (id) => {
    try {
        const result = await pool2.query('DELETE FROM roles WHERE id = $1 RETURNING *', [id]);
        return result.rows[0];
    } catch (error) {
        console.error('Error en deleteRole:', error);
        throw error;
    }
};

/**
 * Asigna un rol a un usuario.
 */
const assignRoleToUser = async (userId, roleId) => {
    try {
        // Verificar que el usuario existe en DB1
        const userResult = await pool.query('SELECT id FROM users WHERE id = $1', [userId]);
        if (userResult.rows.length === 0) {
            throw new Error('El usuario no existe.');
        }

        await pool2.query(
            'INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2) ON CONFLICT (user_id, role_id) DO NOTHING',
            [userId, roleId]
        );
        return { success: true, message: 'Rol asignado correctamente.' };
    } catch (error) {
        console.error('Error en assignRoleToUser:', error);
        throw error;
    }
};

/**
 * Elimina un rol de un usuario.
 */
const removeRoleFromUser = async (userId, roleId) => {
    try {
        await pool2.query('DELETE FROM user_roles WHERE user_id = $1 AND role_id = $2', [userId, roleId]);
        return { success: true, message: 'Rol eliminado del usuario.' };
    } catch (error) {
        console.error('Error en removeRoleFromUser:', error);
        throw error;
    }
};

/**
 * Obtiene los roles y permisos de un usuario.
 */
const getUserRoles = async (userId) => {
    try {
        const query = `
      SELECT r.id, r.name, r.permissions
      FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = $1
    `;
        const result = await pool2.query(query, [userId]);
        return result.rows;
    } catch (error) {
        console.error('Error en getUserRoles:', error);
        throw error;
    }
};

module.exports = {
    getRoles,
    createRole,
    updateRole,
    deleteRole,
    assignRoleToUser,
    removeRoleFromUser,
    getUserRoles,
};
