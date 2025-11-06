# Pintureria Mercurio - Dashboard de Cliente

Este proyecto es una aplicación web full-stack de tipo dashboard diseñada para que los clientes de Pintureria Mercurio puedan gestionar sus cuentas, pedidos e interactuar con la empresa.

La aplicación consiste en un frontend de React (construido con Vite) y un backend middleware (Node.js/Express) que se conecta a una base de datos PostgreSQL para gestionar toda la lógica de negocio.

## Características Principales

La aplicación simula un portal de cliente completo, permitiendo la navegación entre varias secciones clave:

* **Login / Registro:** Páginas de autenticación y creación de cuentas (con hashing de contraseñas en el backend).
* **Dashboard Principal:** Un panel central con accesos directos a todas las funcionalidades.
* **Mi Perfil:** Formulario para que los clientes vean y actualicen sus datos de registro (simulando campos de Protheus como A1_COD, A1_LOJA, etc.).
* **Nuevo Pedido:** Interfaz para la creación de nuevos pedidos, permitiendo filtrar productos, añadirlos a un carrito y enviar la orden.
* **Generación de Presupuestos:** Desde "Nuevo Pedido", se puede generar un presupuesto en PDF (jsPDF) y guardarlo en el backend con estado "Cotizado".
* **Histórico de Pedidos:** Muestra una tabla con el historial de pedidos del cliente y sus estados (Entregado, Pendiente, Cotizado, etc.).
* **Lista de Precios:** Permite buscar y filtrar todos los productos de la base de datos para consultar precios.
* **Ofertas:** Muestra las ofertas y promociones vigentes cargadas desde la base de datos.
* **Cuenta Corriente:** Presenta un resumen del saldo de la cuenta del cliente (total, disponible, pendiente) y los últimos movimientos.
* **Consultas:** Un formulario para que el cliente pueda enviar consultas o reclamos.
* **Carga de Comprobantes:** Una interfaz para arrastrar y soltar (drag-and-drop) archivos (PDF, JPG, PNG) y subirlos al servidor (usando multer).

## Tech Stack (Tecnologías Utilizadas)

### Frontend

* **Framework:** React 19
* **Bundler:** Vite
* **Estilos:** Tailwind CSS (cargado vía CDN)
* **Iconos:** lucide-react
* **Generación de PDF:** jsPDF

### Backend

* **Runtime:** Node.js
* **Framework:** Express
* **Base de Datos:** PostgreSQL (con node-pg)
* **Autenticación:** bcryptjs (para hashing de contraseñas)
* **Manejo de Archivos:** multer (para la carga de comprobantes)
* **Variables de Entorno:** dotenv

## Estructura del Proyecto

El proyecto está organizado con el frontend (`src`) y el backend (`backend/middleware`) en el mismo repositorio.

```bash
my-dashboard-app/
├── backend/middleware/
│   ├── db.js           # Gestor de conexión a PostgreSQL
│   ├── server.js       # Servidor Express (API REST)
│   ├── setup.sql       # Script de creación de la base de datos
│   ├── package.json    # Dependencias del backend
│   └── .env            # (Requerido) Variables de entorno
├── public/
│   └── vite.svg
├── src/
│   ├── components/
│   │   ├── DashboardCard.jsx
│   │   └── Header.jsx
│   ├── pages/
│   │   ├── AccountBalancePage.jsx
│   │   ├── DashboardPage.jsx
│   │   ├── LoginPage.jsx
│   │   ├── NewOrderPage.jsx
│   │   ├── OffersPage.jsx
│   │   ├── OrderHistoryPage.jsx
│   │   ├── PriceListPage.jsx
│   │   ├── ProfilePage.jsx
│   │   ├── QueriesPage.jsx
│   │   ├── RegisterPage.jsx
│   │   └── VoucherUploadPage.jsx
│   ├── App.jsx         # Manejador principal de estado y navegación
│   └── main.jsx        # Punto de entrada de React
├── index.html          # HTML principal (incluye CDN de Tailwind y jsPDF)
└── package.json        # Dependencias del frontend (React)
```

## Instalación y Puesta en Marcha

Para correr este proyecto localmente, necesitas tener Node.js y PostgreSQL instalados. La aplicación requiere que tanto el frontend como el backend estén corriendo simultáneamente.

### 1. Backend (Servidor Middleware)

1.  Navegar a la carpeta del backend:
    ```bash
    cd backend/middleware
    ```
2.  Instalar dependencias del backend:
    ```bash
    npm install
    ```
3.  Configurar la Base de Datos:
    * Asegúrate de que tu servicio de PostgreSQL esté corriendo.
    * Crea una base de datos (ej. `mercurio_db`).
    * Ejecuta el script `setup.sql` en tu base de datos para crear todas las tablas (users, products, orders, etc.).
    * (Ej. usando `psql`: `psql -U tu_usuario -d mercurio_db -f setup.sql`)

4.  Crear variables de entorno:
    * Crea un archivo `.env` en la carpeta `backend/middleware/`.
    * Añade tus credenciales de PostgreSQL (basado en `db.js`):
        ```.env
        DB_USER=tu_usuario_postgres
        DB_HOST=localhost
        DB_DATABASE=mercurio_db
        DB_PASSWORD=tu_contraseña_postgres
        DB_PORT=5432
        ```
5.  Iniciar el servidor backend:
    ```bash
    node server.js
    ```
    * El servidor estará corriendo y escuchando en `http://localhost:3001`.

### 2. Frontend (Aplicación React)

1.  Abrir una nueva terminal y navegar a la raíz del proyecto (la carpeta que contiene `src`).

2.  Instalar dependencias del frontend:
    ```bash
    npm install
    ```
3.  Iniciar el cliente de desarrollo (Vite):
    ```bash
    npm run dev
    ```
    La aplicación estará disponible en `http://localhost:5173` (o el puerto que indique Vite). Ya está configurada para hacer peticiones al backend en el puerto 3001.

## Scripts del Frontend

* **Construir para producción (Build):**
    ```bash
    npm run build
    ```
    Genera la carpeta `dist` con los archivos optimizados para producción.

* **Linting:**
    ```bash
    npm run lint
    ```
    Ejecuta ESLint para revisar el estilo y errores del código.

* **Previsualizar la build:**
    ```bash
    npm run preview
    ```
    Inicia un servidor local para probar la carpeta `dist` generada por el build.
