-- =================================================================
-- ESQUEMA DE BASE DE DATOS (PostgreSQL)
-- Pintureria Mercurio - Dashboard de Cliente
-- =================================================================

-- 1. Tabla de Clientes (Usuarios)
-- Almacena la información de login y los datos de Protheus
DROP TABLE IF EXISTS users CASCADE;
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    -- Campos de Protheus (para referencia)
    a1_cod VARCHAR(6) UNIQUE NOT NULL, -- Código de cliente (ej. "000101")
    a1_loja VARCHAR(2) NOT NULL,       -- Tienda (ej. "01")
    
    -- Campos de la Aplicación
    a1_nombre VARCHAR(100) NOT NULL,    -- Razón Social
    a1_email VARCHAR(100) UNIQUE NOT NULL, -- Email (para login)
    a1_password_hash VARCHAR(100) NOT NULL, -- Contraseña hasheada
    a1_cuit VARCHAR(20),
    a1_tel VARCHAR(50),
    aExample_cond_iva VARCHAR(50),      -- Condición de IVA (ej. "Resp. Inscripto")
    aExample_transporte VARCHAR(100),   -- Transporte habitual
    aExample_vendedor_cod VARCHAR(5),   -- Código de Vendedor
    aExample_vendedor_desc VARCHAR(100), -- Nombre de Vendedor
    
    -- Datos de dirección (opcionales)
    a1_end VARCHAR(100),                -- Dirección
    a1_bairro VARCHAR(50),              -- Barrio
    a1_mun VARCHAR(50),                 -- Localidad
    a1_cep VARCHAR(20),                 -- Código Postal
    a1_estado VARCHAR(50),              -- Provincia
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabla de Productos
-- Lista de precios principal
DROP TABLE IF EXISTS products CASCADE;
CREATE TABLE products (
    id SERIAL PRIMARY KEY,
    code VARCHAR(50) UNIQUE NOT NULL, -- Código de producto (SKU)
    name VARCHAR(255) NOT NULL,
    brand VARCHAR(100),               -- Marca (Usado como "Grupo" en el frontend)
    product_group VARCHAR(50),        -- (NUEVO) Código de Grupo (ej. '001')
    capacity_desc VARCHAR(100),       -- Descripción de capacidad (ej. "1Lt", "20Kgs")
    price NUMERIC(10, 2) NOT NULL,
    stock INT NOT NULL,
    
    -- (NUEVAS COLUMNAS AGREGADAS)
    moneda INTEGER DEFAULT 1,
    cotizacion NUMERIC(10, 2) DEFAULT 1.00,
    
    -- (Columna de ejemplo para ofertas)
    is_offer BOOLEAN DEFAULT FALSE,
    offer_price NUMERIC(10, 2),
    
    image_url TEXT, -- URL a la imagen del producto (opcional)
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


-- 3. Tabla de Pedidos (Cabecera)
-- Almacena la información general de cada pedido
DROP TABLE IF EXISTS orders CASCADE;
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id),
    order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Estado del pedido:
    -- 'Cotizado' (Presupuesto), 'Pendiente' (Enviado), 'Entregado', 'Cancelado'
    status VARCHAR(50) NOT NULL DEFAULT 'Pendiente', 
    
    total_amount NUMERIC(12, 2) NOT NULL,
    
    -- Observaciones del cliente
    notes TEXT,
    
    -- (NUEVO) Referencia al PDF del presupuesto (opcional)
    pdf_filename VARCHAR(255)
);

-- 4. Tabla de Detalles de Pedido (Items)
-- Almacena los productos específicos de cada pedido
DROP TABLE IF EXISTS order_details CASCADE;
CREATE TABLE order_details (
    id SERIAL PRIMARY KEY,
    order_id INT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    product_id INT NOT NULL REFERENCES products(id),
    quantity INT NOT NULL,
    unit_price NUMERIC(10, 2) NOT NULL, -- Precio al momento de la compra
    
    -- Guardamos los datos del producto para referencia histórica
    product_code VARCHAR(50),
    product_name VARCHAR(255),
    product_capacity VARCHAR(100)
);

-- 5. Tabla de Cuenta Corriente (Movimientos)
-- Simula los movimientos (facturas, recibos, NC, ND)
DROP TABLE IF EXISTS account_movements CASCADE;
CREATE TABLE account_movements (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id),
    movement_date DATE NOT NULL,
    document_type VARCHAR(10), -- ej. 'FC' (Factura), 'RE' (Recibo), 'NC', 'ND'
    document_number VARCHAR(50) NOT NULL,
    due_date DATE,
    -- 'debe' (cargos, ej. FC) y 'haber' (créditos, ej. RE)
    debe NUMERIC(12, 2) DEFAULT 0,
    haber NUMERIC(12, 2) DEFAULT 0,
    
    -- Saldo pendiente (solo para facturas)
    pending_balance NUMERIC(12, 2) DEFAULT 0,
    
    -- Estado: 'Pendiente', 'Cancelado'
    status VARCHAR(50) DEFAULT 'Pendiente'
);


-- 6. Tabla de Comprobantes Subidos
-- Almacena los archivos que sube el cliente (ej. retenciones)
DROP TABLE IF EXISTS vouchers CASCADE;
CREATE TABLE vouchers (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id),
    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    file_name VARCHAR(255) NOT NULL, -- Nombre original
    file_path VARCHAR(255) NOT NULL, -- Path en el servidor (ej. /uploads/...)
    file_type VARCHAR(100), -- Mime type (ej. 'application/pdf')
    description TEXT -- Comentario opcional del cliente
);

-- 7. Tabla de Consultas/Reclamos
-- Almacena los mensajes enviados desde el formulario de "Consultas"
DROP TABLE IF EXISTS queries CASCADE;
CREATE TABLE queries (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id),
    query_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    subject VARCHAR(255) NOT NULL, -- Asunto (ej. 'Reclamo', 'Duda')
    message TEXT NOT NULL,
    
    -- Estado: 'Recibido', 'En Proceso', 'Resuelto'
    status VARCHAR(50) DEFAULT 'Recibido'
);


-- =================================================================
-- DATOS DE EJEMPLO (Mock Data)
-- =================================================================

-- 1. Insertar un usuario de prueba
-- (La contraseña es "1234")
INSERT INTO users 
    (a1_cod, a1_loja, a1_nombre, a1_email, a1_password_hash, a1_cuit, a1_tel, aExample_cond_iva, a1_end, a1_mun) 
VALUES 
    ('000101', '01', 'Cliente de Prueba SRL', 'cliente@prueba.com', '$2a$10$w7gS.Sg./.G3Y2eXG.iGOeE./mF0OQ6hHhl2/bYQxY2K9.e.xVUte', '30-12345678-9', '3496-123456', 'Responsable Inscripto', 'Av. Siempre Viva 742', 'Springfield');

-- 2. Insertar productos de prueba
INSERT INTO products (code, name, brand, product_group, capacity_desc, price, stock, is_offer, offer_price) VALUES
('P001', 'Mercurio Látex Interior Mate', 'Mercurio', '001', '1 Lt', 1500.00, 100, FALSE, NULL),
('P002', 'Mercurio Látex Interior Mate', 'Mercurio', '001', '4 Lts', 5500.00, 80, TRUE, 5200.00),
('P003', 'Mercurio Látex Interior Mate', 'Mercurio', '001', '10 Lts', 12000.00, 50, FALSE, NULL),
('P004', 'Mercurio Látex Interior Mate', 'Mercurio', '001', '20 Lts', 22000.00, 30, FALSE, NULL),
('P005', 'Mercurio Esmalte Sintético', 'Mercurio', '002', '1 Lt', 2200.00, 70, FALSE, NULL),
('P006', 'Mercurio Esmalte Sintético', 'Mercurio', '002', '4 Lts', 8000.00, 40, FALSE, NULL),
('P007', 'Lija al Agua Grano 120', 'OtraMarca', '003', 'Unidad', 300.00, 200, FALSE, NULL),
('P008', 'Lija al Agua Grano 220', 'OtraMarca', '003', 'Unidad', 300.00, 200, FALSE, NULL),
('P009', 'Pincel N°10', 'Pincelito', '004', 'Unidad', 800.00, 150, TRUE, 750.00),
('P010', 'Rodillo Lana N°22', 'Rodin', '004', 'Unidad', 2500.00, 100, FALSE, NULL);

-- 3. Insertar movimientos de cuenta corriente
INSERT INTO account_movements (user_id, movement_date, document_type, document_number, due_date, debe, haber, pending_balance, status) VALUES
(1, '2024-05-01', 'FC', '0001-00012345', '2024-05-30', 50000.00, 0, 50000.00, 'Pendiente'),
(1, '2024-05-05', 'FC', '0001-00012380', '2024-06-04', 75000.00, 0, 75000.00, 'Pendiente'),
(1, '2024-05-10', 'RE', '0001-00008001', NULL, 0, 50000.00, 0, 'Cancelado'),
(1, '2024-05-12', 'NC', '0001-00001101', NULL, 0, 5000.00, 0, 'Cancelado');

-- 4. Insertar un pedido de ejemplo (Entregado)
INSERT INTO orders (user_id, order_date, status, total_amount) VALUES
(1, '2024-05-01 10:30:00', 'Entregado', 27500.00);

INSERT INTO order_details (order_id, product_id, quantity, unit_price, product_code, product_name, product_capacity) VALUES
(1, 2, 5, 5500.00, 'P002', 'Mercurio Látex Interior Mate', '4 Lts');

-- 5. Insertar un presupuesto de ejemplo (Cotizado)
INSERT INTO orders (user_id, order_date, status, total_amount, pdf_filename) VALUES
(1, '2024-05-10 15:00:00', 'Cotizado', 12000.00, 'presupuesto_00002.pdf');

INSERT INTO order_details (order_id, product_id, quantity, unit_price, product_code, product_name, product_capacity) VALUES
(2, 3, 1, 12000.00, 'P003', 'Mercurio Látex Interior Mate', '10 Lts');

-- 6. Insertar un pedido de ejemplo (Pendiente)
INSERT INTO orders (user_id, order_date, status, total_amount) VALUES
(1, '2024-05-11 11:00:00', 'Pendiente', 3000.00);

INSERT INTO order_details (order_id, product_id, quantity, unit_price, product_code, product_name, product_capacity) VALUES
(3, 7, 10, 300.00, 'P007', 'Lija al Agua Grano 120', 'Unidad');


-- (Fin del Script)