-- Script para crear la tabla de Vendedores

CREATE TABLE vendedores (
    codigo VARCHAR(255) PRIMARY KEY NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    telefono VARCHAR(50),
    password VARCHAR(255) NOT NULL
);

-- Ejemplo de cómo insertar un vendedor (la contraseña debe ser hasheada en la aplicación)
-- INSERT INTO vendedores (codigo, nombre, email, telefono, password) VALUES ('V001', 'Juan Perez', 'juan.perez@example.com', '123456789', 'hash_de_la_contraseña');
