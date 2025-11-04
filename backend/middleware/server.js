/*
* =================================================================
* SERVIDOR MIDDLEWARE (Node.js + Express) - ACTUALIZADO
* =================================================================
*
* Para ejecutarlo:
* 1. Abre una terminal en esta carpeta.
* 2. Corre: npm install express cors multer
* 3. Corre: node server.js
*
* El servidor se ejecutará en http://localhost:3001
* =================================================================
*/

const express = require('express');
const cors = require('cors');
const multer = require('multer'); // (NUEVO) Para manejar subida de archivos
const path = require('path');

const app = express();
const PORT = 3001;

// --- Configuración ---
app.use(cors()); // Habilita CORS
app.use(express.json()); // Permite al servidor entender JSON

// (NUEVO) Configuración de Multer para guardar archivos
// Los archivos se guardarán en una carpeta 'uploads/' en este mismo directorio
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    // Renombra el archivo para evitar colisiones: [timestamp]-[nombre-original]
    cb(null, Date.now() + '-' + file.originalname);
  }
});
const upload = multer({ storage: storage });


// =================================================================
// --- INICIO DE SIMULACIÓN DE PROTHEUS ---
// Aquí reemplazas con las llamadas reales a Protheus
// =================================================================

// --- Simulación de Autenticación (SA1 - Clientes) ---
const authenticateProtheusUser = async (username, password) => {
  await new Promise(res => setTimeout(res, 500));
  // Lógica de simulación: cualquier usuario/pass no vacío funciona
  if (username && password) {
    return { success: true, user: { name: 'Nombre de la Empresa (desde API)', code: username } };
  }
  return { success: false, message: 'Usuario o contraseña incorrectos.' };
};

// --- Simulación de Cuenta Corriente (SE1/SE2) ---
const fetchProtheusBalance = async () => {
  await new Promise(res => setTimeout(res, 800)); 
  return {
    total: '$150,000.00',
    available: '$50,000.00',
    pending: '$100,000.00'
  };
};
const fetchProtheusMovements = async () => {
  await new Promise(res => setTimeout(res, 800));
  return [
    { id: 'F-001', date: '2024-10-28', description: 'Factura A-001-12345', debit: '$25,000.00', credit: '' },
    { id: 'P-001', date: '2024-10-27', description: 'Pago recibido (desde API)', debit: '', credit: '$50,000.00' },
    { id: 'F-002', date: '2024-10-25', description: 'Factura A-001-12340', debit: '$175,000.00', credit: '' },
  ];
};

// --- (NUEVO) Simulación Histórico de Pedidos (SC6/SC7) ---
const fetchProtheusOrders = async () => {
  await new Promise(res => setTimeout(res, 1000));
  return [
    { id: '12345', date: '2024-10-28', total: '$15,000.00', status: 'Entregado' },
    { id: '12346', date: '2024-10-25', total: '$8,200.00', status: 'Entregado' },
    { id: '12347', date: '2024-10-22', total: '$1,500.00', status: 'Pendiente' },
    { id: '12348', date: '2024-10-19', total: '$22,100.00', status: 'En Proceso' },
    { id: '12349', date: '2024-10-15', total: '$5,000.00', status: 'Cancelado' },
  ];
};

// --- (NUEVO) Simulación Lista de Precios (SB1/DA1) ---
const fetchProtheusProducts = async () => {
  await new Promise(res => setTimeout(res, 700));
  return [
    { id: 'PM-1001', name: 'Latex Interior Mate 20L', brand: 'Pinturas Mercurio', price: 25000, stock: 10 },
    { id: 'AL-500', name: 'Sintético Brillante Blanco 1L', brand: 'Marca Alba', price: 5500, stock: 50 },
    { id: 'ST-202', name: 'Impermeabilizante Techos 10L', brand: 'Marca Sinteplast', price: 18000, stock: 15 },
    { id: 'TS-300', name: 'Barniz Marino 1L', brand: 'Marca Tersuave', price: 4200, stock: 30 },
    { id: 'EG-010', name: 'Pincel N°10 Virola 1', brand: 'Pinceles El Galgo', price: 1500, stock: 100 },
    { id: 'PM-1002', name: 'Latex Exterior 10L', brand: 'Pinturas Mercurio', price: 19000, stock: 20 },
    { id: 'AL-505', name: 'Sintético Brillante Negro 1L', brand: 'Marca Alba', price: 5500, stock: 40 },
  ];
};

// --- (NUEVO) Simulación Ofertas ---
const fetchProtheusOffers = async () => {
  await new Promise(res => setTimeout(res, 400));
  return [
    {
      id: 1,
      title: 'Kit Pintor (Dato de API)',
      description: 'Llevate 20L de Latex Interior + Rodillo + Pincel N°10 con un 20% de descuento.',
      price: '$28,000.00',
      oldPrice: '$35,000.00',
      imageUrl: 'https://placehold.co/600x400/ef4444/white?text=Oferta+Kit',
    },
    {
      id: 2,
      title: '2x1 en Sintético Brillante Alba',
      description: 'Comprando 1L de Sintético Brillante Blanco, te llevas otro de regalo.',
      price: '$5,500.00',
      oldPrice: '$11,000.00',
      imageUrl: 'https://placehold.co/600x400/3b82f6/white?text=Oferta+2x1',
    }
  ];
};

// --- (NUEVO) Simulación Guardar Consulta (SAC) ---
const saveProtheusQuery = async (queryData) => {
  await new Promise(res => setTimeout(res, 1000));
  console.log('Consulta recibida para guardar en Protheus:', queryData);
  // Aquí iría la lógica para insertar en SAC
  return { success: true, ticketId: `TKT-${Date.now()}` };
};

// --- (NUEVO) Simulación Guardar Pedido (SC6/SC7) ---
const saveProtheusOrder = async (orderData) => {
  await new Promise(res => setTimeout(res, 1500));
  console.log('Pedido recibido para guardar en Protheus:', orderData);
  // Aquí iría la lógica para insertar en SC6/SC7
  return { success: true, orderId: `PED-${Date.now()}` };
};

// --- (NUEVO) Simulación Guardar Comprobante ---
const saveProtheusVoucher = async (fileInfo) => {
  await new Promise(res => setTimeout(res, 1000));
  console.log('Archivo recibido, guardando referencia en Protheus:', fileInfo);
  // Aquí iría la lógica para asociar el archivo (fileInfo.path) a SE1/SE2
  return { success: true, fileRef: fileInfo.filename };
};

// =================================================================
// --- ENDPOINTS DE TU API ---
// =================================================================

// --- Autenticación ---
app.post('/api/login', async (req, res) => {
  console.log('POST /api/login -> Autenticando usuario...');
  try {
    const { username, password } = req.body;
    const result = await authenticateProtheusUser(username, password);
    if (result.success) {
      res.json(result);
    } else {
      res.status(401).json({ message: result.message });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error interno del servidor.' });
  }
});

// --- Cuenta Corriente ---
app.get('/api/balance', async (req, res) => {
  console.log('GET /api/balance -> Solicitando saldo a Protheus...');
  try {
    const balanceData = await fetchProtheusBalance();
    res.json(balanceData);
  } catch (error) {
    res.status(500).json({ message: 'Error interno del servidor al consultar saldo.' });
  }
});

app.get('/api/movements', async (req, res) => {
  console.log('GET /api/movements -> Solicitando movimientos a Protheus...');
  try {
    const movementsData = await fetchProtheusMovements();
    res.json(movementsData);
  } catch (error) {
    res.status(500).json({ message: 'Error interno del servidor al consultar movimientos.' });
  }
});

// --- (NUEVO) Pedidos ---
app.get('/api/orders', async (req, res) => {
  console.log('GET /api/orders -> Solicitando histórico de pedidos...');
  try {
    const orders = await fetchProtheusOrders();
    res.json(orders);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener pedidos.' });
  }
});

app.post('/api/orders', async (req, res) => {
  console.log('POST /api/orders -> Guardando nuevo pedido...');
  try {
    const orderData = req.body;
    const result = await saveProtheusOrder(orderData);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Error al guardar el pedido.' });
  }
});

// --- (NUEVO) Productos y Ofertas ---
app.get('/api/products', async (req, res) => {
  console.log('GET /api/products -> Solicitando lista de precios...');
  try {
    const products = await fetchProtheusProducts();
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener productos.' });
  }
});

app.get('/api/offers', async (req, res) => {
  console.log('GET /api/offers -> Solicitando ofertas...');
  try {
    const offers = await fetchProtheusOffers();
    res.json(offers);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener ofertas.' });
  }
});

// --- (NUEVO) Consultas y Carga de Archivos ---
app.post('/api/queries', async (req, res) => {
  console.log('POST /api/queries -> Guardando consulta...');
  try {
    const queryData = req.body;
    const result = await saveProtheusQuery(queryData);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: 'Error al enviar la consulta.' });
  }
});

// (NUEVO) Endpoint para subida de archivos
// Usa el middleware 'upload' de multer para procesar un solo archivo llamado 'voucherFile'
app.post('/api/upload-voucher', upload.single('voucherFile'), async (req, res) => {
  console.log('POST /api/upload-voucher -> Archivo recibido...');
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No se recibió ningún archivo.' });
    }
    
    // El archivo se guardó en 'uploads/'. Ahora guardamos la referencia en Protheus.
    const fileInfo = {
      filename: req.file.filename,
      originalName: req.file.originalname,
      path: req.file.path,
      size: req.file.size
    };
    
    const result = await saveProtheusVoucher(fileInfo);
    res.json({ success: true, fileInfo: result });

  } catch (error) {
    res.status(500).json({ message: 'Error al procesar el archivo.' });
  }
});


// --- Iniciar el servidor ---
app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`  Servidor Middleware (Puente a Protheus)`);
  console.log(`  Escuchando en http://localhost:${PORT}`);
  console.log(`=======================================================`);
});

