-- 1. ELIMINAMOS TABLAS EN ORDEN INVERSO (DEPENDIENTES PRIMERO)
-- Estas dependen de 'orders' y 'products'
DROP TABLE IF EXISTS order_items;

-- Estas dependen de 'users'
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS account_movements;
DROP TABLE IF EXISTS queries;
DROP TABLE IF EXISTS vouchers;

-- Ahora sí podemos eliminar las tablas principales (de las que otras dependían)
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS users;

-- 2. CREAMOS TABLAS EN ORDEN LÓGICO (PRINCIPALES PRIMERO)

-- Tabla de Usuarios
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    -- Campos simulados de Protheus
    a1_cod VARCHAR(20), -- Código de cliente
    a1_loja VARCHAR(10), -- Sucursal
    a1_cgc VARCHAR(20),  -- CUIT/DNI
    a1_tel VARCHAR(30),
    a1_endereco TEXT,    -- Dirección
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Productos (Tu nueva estructura)
CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) UNIQUE NOT NULL, -- Para _Codigo
  description TEXT,                  -- Para _Descripcion
  capacity VARCHAR(50),              -- Para _Capacidad
  product_group VARCHAR(100),        -- Para _Grupo
  ts_standard VARCHAR(50),           -- Para _TS Estandar
  table_code VARCHAR(50),            -- Para _Cod. Tabla
  price NUMERIC(12, 2) DEFAULT 0.00, -- Para _Precio Venta
  capacity_description TEXT,         -- Para _Desc Capacid
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabla de Pedidos (Órdenes)
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    status VARCHAR(50) DEFAULT 'Pendiente', -- Ej: Pendiente, Cotizado, Entregado
    total NUMERIC(12, 2) DEFAULT 0.00,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    -- Conectamos el pedido (order) con el usuario (user)
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

-- Tabla de Items del Pedido (Conexión entre Pedidos y Productos)
CREATE TABLE order_items (
    id SERIAL PRIMARY KEY,
    order_id INTEGER NOT NULL,
    product_id INTEGER, -- Puede ser NULL si el producto fue borrado
    product_code VARCHAR(50) NOT NULL, -- Guardamos el código por si el producto se borra
    quantity INTEGER NOT NULL,
    unit_price NUMERIC(12, 2) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Conectamos el item con el pedido (order)
    FOREIGN KEY (order_id) REFERENCES orders (id) ON DELETE CASCADE,
    -- Conectamos el item con el producto (product)
    FOREIGN KEY (product_id) REFERENCES products (id) ON DELETE SET NULL
);

-- (NUEVO) Tabla de Movimientos de Cuenta Corriente (para AccountBalancePage)
CREATE TABLE account_movements (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    date DATE NOT NULL,
    description TEXT,
    debit NUMERIC(12, 2) DEFAULT 0,
    credit NUMERIC(12, 2) DEFAULT 0,
    balance NUMERIC(12, 2) DEFAULT 0, -- Saldo después del movimiento
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

-- (NUEVO) Tabla de Consultas (para QueriesPage)
CREATE TABLE queries (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    subject VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    status VARCHAR(50) DEFAULT 'Recibida', -- Ej: Recibida, En Proceso, Resuelta
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

-- (NUEVO) Tabla de Comprobantes (para VoucherUploadPage)
CREATE TABLE vouchers (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    file_path VARCHAR(255) NOT NULL, -- Ruta en el servidor (ej: 'uploads/comprobante-123.pdf')
    original_name VARCHAR(255) NOT NULL,
    file_size BIGINT, -- Tamaño en bytes
    mime_type VARCHAR(100), -- ej: 'image/png', 'application/pdf'
    upload_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);