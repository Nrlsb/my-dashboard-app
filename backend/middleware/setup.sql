-- =================================================================
-- SCRIPT DE CONFIGURACIÓN DE POSTGRESQL
-- =================================================================
-- Ejecuta este script en tu base de datos local (ej. "my_dashboard")
-- para crear las tablas e insertar los datos de ejemplo.
-- =================================================================

-- Limpiar tablas si ya existen (para poder re-ejecutar el script)
DROP TABLE IF EXISTS users, products, orders, order_items, offers, queries, vouchers, account_movements CASCADE;

-- --- Autenticación ---
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username TEXT NOTABLE UNIQUE,
  password_hash TEXT NOTABLE, -- En un proyecto real, esto debe ser un hash (ej. bcrypt)
  company_name TEXT
);

INSERT INTO users (username, password_hash, company_name)
VALUES ('cliente1', '1234', 'Nombre de la Empresa (desde DB)'); -- Simulación de hash

-- --- Productos (Lista de Precios) ---
CREATE TABLE products (
  id TEXT PRIMARY KEY, -- Usamos TEXT para códigos como 'PM-1001'
  name TEXT NOTABLE,
  brand TEXT,
  price NUMERIC(10, 2) NOTABLE,
  stock INTEGER
);

INSERT INTO products (id, name, brand, price, stock) VALUES
('PM-1001', 'Latex Interior Mate 20L', 'Pinturas Mercurio', 25000.00, 10),
('AL-500', 'Sintético Brillante Blanco 1L', 'Marca Alba', 5500.00, 50),
('ST-202', 'Impermeabilizante Techos 10L', 'Marca Sinteplast', 18000.00, 15),
('TS-300', 'Barniz Marino 1L', 'Marca Tersuave', 4200.00, 30),
('EG-010', 'Pincel N°10 Virola 1', 'Pinceles El Galgo', 1500.00, 100),
('PM-1002', 'Latex Exterior 10L', 'Pinturas Mercurio', 19000.00, 20),
('AL-505', 'Sintético Brillante Negro 1L', 'Marca Alba', 5500.00, 40);

-- --- Pedidos ---
CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  total_amount NUMERIC(10, 2),
  status TEXT -- 'Pendiente', 'En Proceso', 'Entregado', 'Cancelado'
);

CREATE TABLE order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER REFERENCES orders(id) ON DELETE CASCADE,
  product_id TEXT REFERENCES products(id),
  quantity INTEGER,
  price NUMERIC(10, 2) -- Precio al momento de la compra
);

-- Insertar pedidos de ejemplo
INSERT INTO orders (user_id, total_amount, status) VALUES
(1, 15000.00, 'Entregado'),
(1, 8200.00, 'Entregado'),
(1, 1500.00, 'Pendiente'),
(1, 22100.00, 'En Proceso'),
(1, 5000.00, 'Cancelado');

-- --- Ofertas ---
CREATE TABLE offers (
  id SERIAL PRIMARY KEY,
  title TEXT NOTABLE,
  description TEXT,
  price TEXT,
  old_price TEXT,
  image_url TEXT
);

INSERT INTO offers (title, description, price, old_price, image_url) VALUES
('Kit Pintor (Dato de DB)', 'Llevate 20L de Latex Interior + Rodillo + Pincel N°10 con un 20% de descuento.', '$28,000.00', '$35,000.00', 'https://placehold.co/600x400/ef4444/white?text=Oferta+Kit'),
('2x1 en Sintético Brillante Alba', 'Comprando 1L de Sintético Brillante Blanco, te llevas otro de regalo.', '$5,500.00', '$11,000.00', 'https://placehold.co/600x400/3b82f6/white?text=Oferta+2x1');

-- --- Cuenta Corriente ---
CREATE TABLE account_movements (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  move_date DATE NOTABLE,
  description TEXT,
  debit NUMERIC(10, 2) DEFAULT 0,
  credit NUMERIC(10, 2) DEFAULT 0
);

INSERT INTO account_movements (user_id, move_date, description, debit, credit) VALUES
(1, '2024-10-28', 'Factura A-001-12345', 25000.00, 0),
(1, '2024-10-27', 'Pago recibido (desde DB)', 0, 50000.00),
(1, '2024-10-25', 'Factura A-001-12340', 175000.00, 0);

-- --- Consultas y Comprobantes ---
CREATE TABLE queries (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  subject TEXT,
  message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE vouchers (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  filename TEXT,
  original_name TEXT,
  path TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
