const jwt = require('jsonwebtoken');
const pool = require('../db'); // Ajusta la ruta a '../db' ya que estamos un nivel adentro

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    try {
      // 1. Obtener el token del header
      token = req.headers.authorization.split(' ')[1];

      // 2. Verificar el token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // 3. Obtener el usuario (sin la contraseña) y adjuntarlo a req
      const userResult = await pool.query(
        'SELECT id, name, email, cuit, address, phone, is_admin FROM users WHERE id = $1',
        [decoded.id]
      );

      if (userResult.rows.length > 0) {
        req.user = userResult.rows[0];
        next(); // Continuar a la siguiente función (el controlador)
      } else {
        res.status(401).json({ message: 'No autorizado, usuario no encontrado' });
      }
    } catch (error) {
      console.error('Error de autenticación:', error);
      res.status(401).json({ message: 'No autorizado, el token falló' });
    }
  }

  if (!token) {
    res.status(401).json({ message: 'No autorizado, no se encontró token' });
  }
};

module.exports = { protect };