-- Migración para añadir la columna de vendedor a la tabla de usuarios.
-- Esto permitirá asociar un cliente (usuario) a un vendedor.

ALTER TABLE users
ADD COLUMN vendedor_codigo VARCHAR(255);

-- Opcionalmente, puedes añadir una clave foránea para asegurar la integridad referencial.
-- Esto solo funcionará si la tabla 'vendedores' y su columna 'codigo' ya existen.
-- ALTER TABLE users
-- ADD CONSTRAINT fk_vendedor
-- FOREIGN KEY (vendedor_codigo)
-- REFERENCES vendedores(codigo);

-- Ejemplo de cómo actualizar un usuario para asignarle un vendedor:
-- UPDATE users SET vendedor_codigo = 'V001' WHERE id = 123;
