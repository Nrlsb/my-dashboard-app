-- =================================================================
-- SCRIPT DE CONFIGURACIÓN DE POSTGRESQL (Actualizado)
-- =================================================================
-- Se ha modificado la tabla 'users' para incluir los campos
-- solicitados en la captura de pantalla del cliente.
-- =================================================================

-- Limpiar tablas si ya existen (para poder re-ejecutar el script)
DROP TABLE IF EXISTS users, products, orders, order_items, offers, queries, vouchers, account_movements CASCADE;

-- --- Autenticación y Datos del Cliente ---
-- (ACTUALIZADO) Se añaden todos los campos del formulario de cliente
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  username TEXT NOT NULL UNIQUE, -- Usuario de Login (CORREGIDO: NOTABLE -> NOT NULL)
  password_hash TEXT NOT NULL, -- (CORREGIDO: NOTABLE -> NOT NULL)
  
  -- Campos de la captura (pestaña "de Registro")
  codigo TEXT, -- A1_COD
  tienda TEXT, -- A1_LOJA
  nombre TEXT, -- A1_NOME
  fisica_juridica TEXT, -- A1_PESSOA
  n_fantasia TEXT, -- A1_NREDUZ
  direccion TEXT, -- A1_END
  municipio TEXT, -- A1_MUN
  provincia TEXT, -- A1_EST
  estatus TEXT,
  telefono TEXT, -- A1_NUMBER
  email TEXT, -- A1_EMAIL
  descr_pais TEXT DEFAULT 'ARGENTINA',
  tipo_iva TEXT, -- A1_TIPO
  tipo_doc TEXT, -- A1_AFIP
  cuit_cuil TEXT, -- A1_CGC
  di TEXT
);

-- NOTA: Se elimina el INSERT de ejemplo. El registro se debe
-- hacer desde la app para que la contraseña se guarde
-- hasheada correctamente por bcrypt.


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
-- (Se asume que el user_id = 1 será creado por el primer registro)
-- INSERT INTO orders (user_id, total_amount, status) VALUES ...

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

-- (Se asume que el user_id = 1 será creado por el primer registro)
-- INSERT INTO account_movements (user_id, move_date, description, debit, credit) VALUES ...

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