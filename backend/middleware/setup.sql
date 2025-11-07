-- Eliminar tablas si existen para permitir una reinicialización limpia (para desarrollo)
-- En producción, no ejecutarías esto, solo los CREATE INDEX.
DROP TABLE IF EXISTS vouchers;
DROP TABLE IF EXISTS queries;
DROP TABLE IF EXISTS account_movements;
DROP TABLE IF EXISTS order_items;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS users;

-- --- TABLA DE USUARIOS ---
-- Almacena los datos de login y perfil del cliente
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    a1_cod VARCHAR(10) UNIQUE, -- Código de cliente Protheus (simulado)
    a1_loja VARCHAR(2) DEFAULT '01',
    full_name VARCHAR(100),
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(100) NOT NULL, -- Contraseña hasheada
    a1_cgc VARCHAR(20), -- CUIT/DNI
    a1_tel VARCHAR(30),
    a1_endereco VARCHAR(100), -- Dirección
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- --- TABLA DE PRODUCTOS ---
-- Almacena la lista de precios
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    code VARCHAR(20) UNIQUE NOT NULL, -- Código de producto (ej. B1_COD)
    description VARCHAR(255),
    product_group VARCHAR(50), -- "Marca" (ej. B1_GRUPO)
    price NUMERIC(10, 2), -- Precio de lista
    last_updated TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- --- TABLA DE PEDIDOS ---
-- Cabecera de los pedidos de cliente
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'Pendiente', -- Pendiente, Entregado, Cotizado, Cancelado
    total NUMERIC(12, 2)
);

-- --- TABLA DE ITEMS DE PEDIDO ---
-- Detalle de los productos en cada pedido
CREATE TABLE order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE, -- Si se borra el pedido, se borran los items
    product_id INTEGER NOT NULL REFERENCES products(id),
    product_code VARCHAR(20), -- Denormalizado para reportes más fáciles
    quantity INTEGER NOT NULL,
    unit_price NUMERIC(10, 2) NOT NULL -- Precio al momento de la compra
);

-- --- TABLA DE CUENTA CORRIENTE ---
-- Movimientos de saldo del cliente
CREATE TABLE account_movements (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    date DATE NOT NULL,
    description VARCHAR(255),
    debit NUMERIC(12, 2) DEFAULT 0,
    credit NUMERIC(12, 2) DEFAULT 0,
    order_ref INTEGER REFERENCES orders(id) NULL -- Opcional: link al pedido que generó el movimiento
);

-- --- TABLA DE CONSULTAS ---
-- Mensajes enviados desde el formulario de "Consultas"
CREATE TABLE queries (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    subject VARCHAR(100),
    message TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'Abierta' -- Abierta, Resuelta
);

-- --- TABLA DE COMPROBANTES ---
-- Archivos subidos por los clientes
CREATE TABLE vouchers (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id),
    file_path VARCHAR(255) NOT NULL, -- Ruta en el servidor
    original_name VARCHAR(255),
    mime_type VARCHAR(50), -- ej. 'image/jpeg'
    file_size INTEGER, -- en bytes
    uploaded_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'Pendiente' -- Pendiente, Procesado
);


-- =================================================================
-- --- OPTIMIZACIONES: ÍNDICES ---
-- =================================================================
-- Estos índices aceleran las búsquedas (consultas SELECT)

-- --- Índices en 'orders' ---
-- Acelera la búsqueda de pedidos de un usuario específico, ordenados por fecha.
-- Usado en: fetchProtheusOrders (página de Historial de Pedidos)
CREATE INDEX IF NOT EXISTS idx_orders_user_id_created_at ON orders (user_id, created_at DESC);

-- --- Índices en 'order_items' ---
-- Acelera la unión (JOIN) para encontrar los items de un pedido.
-- Usado en: fetchProtheusOrderDetails (al ver el detalle de UN pedido)
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items (order_id);

-- Acelera la búsqueda inversa (ej. "en qué pedidos está este producto")
CREATE INDEX IF NOT EXISTS idx_order_items_product_id ON order_items (product_id);

-- --- Índices en 'account_movements' ---
-- Acelera la búsqueda de movimientos de Cta. Cte. de un usuario, ordenados por fecha.
-- Usado en: fetchProtheusMovements y fetchProtheusBalance (página de Cuenta Corriente)
CREATE INDEX IF NOT EXISTS idx_account_movements_user_id_date ON account_movements (user_id, date DESC);

-- --- Índices en 'products' ---
-- Acelera la búsqueda y ordenamiento por descripción (nombre).
-- Usado en: fetchProtheusProducts (página de Lista de Precios y Nuevo Pedido)
CREATE INDEX IF NOT EXISTS idx_products_description ON products (description);

-- Acelera el filtrado por "marca" (grupo de producto).
-- Usado en: fetchProtheusProducts (cuando se añade filtro por marca)
CREATE INDEX IF NOT EXISTS idx_products_group ON products (product_group);

-- Acelera el filtrado por precio.
-- Usado en: fetchProtheusProducts (filtro `price >= 400`)
CREATE INDEX IF NOT EXISTS idx_products_price ON products (price);

-- --- Índices en 'queries' y 'vouchers' ---
-- Índices estándar en las Foreign Keys para búsquedas por usuario.
CREATE INDEX IF NOT EXISTS idx_queries_user_id ON queries (user_id);
CREATE INDEX IF NOT EXISTS idx_vouchers_user_id ON vouchers (user_id);