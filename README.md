# Client Dashboard App

Este proyecto es una aplicación web full-stack de tipo dashboard diseñada para que los clientes puedan gestionar sus cuentas, ver productos, realizar pedidos e interactuar con la empresa.

La aplicación consiste en un frontend de **React** (construido con Vite) y un backend **Node.js/Express** que se conecta a una base de datos **PostgreSQL** para gestionar toda la lógica de negocio.

## Características Principales

*   **Autenticación de Usuarios:** Registro e inicio de sesión seguros con hashing de contraseñas (bcrypt).
*   **Dashboard Principal:** Un panel central con accesos directos a las funcionalidades clave.
*   **Gestión de Perfil:** Los usuarios pueden ver y actualizar sus datos de perfil.
*   **Catálogo de Productos:** Lista de precios con filtros y búsqueda para explorar todos los productos.
*   **Creación de Pedidos:** Interfaz para añadir productos a un carrito y generar un nuevo pedido.
*   **Historial de Pedidos:** Tabla con el historial de pedidos del cliente, con acceso a los detalles de cada uno.
*   **Cuenta Corriente:** Resumen del saldo de la cuenta del cliente y un historial detallado de movimientos (débitos y créditos).
*   **Sistema de Consultas:** Formulario para que los clientes envíen consultas o mensajes.
*   **Carga de Comprobantes:** Interfaz para subir archivos (comprobantes de pago, etc.) al servidor.
*   **Notificaciones por Email:** Envío automático de correos para confirmación de pedidos (usando Resend).

## Tech Stack (Tecnologías Utilizadas)

### Frontend

*   **Framework:** React 19
*   **Enrutamiento:** React Router
*   **Gestión de Estado Asíncrono:** TanStack Query
*   **Bundler:** Vite
*   **Iconos:** lucide-react, react-icons

### Backend

*   **Runtime:** Node.js
*   **Framework:** Express
*   **Base de Datos:** PostgreSQL (con `node-pg`)
*   **Autenticación:** `bcryptjs` (hashing de contraseñas)
*   **Manejo de Archivos:** `multer` (carga de archivos)
*   **Variables de Entorno:** `dotenv`
*   **Envío de Emails:** `resend`

## Estructura del Proyecto

```
my-dashboard-app/
├── backend/api/
│   ├── controllers.js  # Lógica de negocio de la API
│   ├── db.js           # Gestor de conexión a PostgreSQL
│   ├── server.js       # Servidor Express (API REST)
│   ├── script.sql      # Script de creación de tablas para la BD
│   ├── package.json    # Dependencias del backend
│   └── .env            # (Requerido) Variables de entorno
├── src/
│   ├── api/
│   ├── components/
│   ├── context/
│   ├── pages/
│   ├── App.jsx         # Componente principal y enrutador
│   └── main.jsx        # Punto de entrada de React
├── index.html
└── package.json        # Dependencias del frontend
```

## Instalación y Puesta en Marcha

Para correr este proyecto localmente, necesitas tener **Node.js** y **PostgreSQL** instalados.

### 1. Backend (Servidor API)

1.  Navega a la carpeta del backend:
    ```bash
    cd backend/api
    ```
2.  Instala las dependencias:
    ```bash
    npm install
    ```
3.  Configura la Base de Datos:
    *   Asegúrate de que tu servicio de PostgreSQL esté corriendo.
    *   Crea una base de datos (ej. `my_dashboard_db`).
    *   Ejecuta el script `script.sql` en tu base de datos para crear todas las tablas.
    *   (Ej. usando `psql`: `psql -U tu_usuario -d my_dashboard_db -f script.sql`)

4.  Crea las variables de entorno:
    *   En la carpeta `backend/api/`, crea un archivo llamado `.env`.
    *   Añade tus credenciales de la base de datos y las claves de la API de email:
        ```.env
        # PostgreSQL DB Credentials
        DB_USER=tu_usuario_postgres
        DB_HOST=localhost
        DB_DATABASE=my_dashboard_db
        DB_PASSWORD=tu_contraseña_postgres
        DB_PORT=5432

        # Email Service (Resend)
        RESEND_API_KEY=tu_api_key_de_resend
        SELLER_EMAIL=email_del_vendedor@ejemplo.com
        EMAIL_FROM=email_de_envio@ejemplo.com
        ```
5.  Inicia el servidor backend:
    ```bash
    node server.js
    ```
    *   El servidor estará corriendo en `http://localhost:3001`.

### 2. Frontend (Aplicación React)

1.  Abre una **nueva terminal** en la raíz del proyecto.

2.  Instala las dependencias:
    ```bash
    npm install
    ```
3.  Inicia el cliente de desarrollo:
    ```bash
    npm run dev
    ```
    *   La aplicación estará disponible en `http://localhost:5173` (o el puerto que indique Vite).

## Scripts Disponibles

Para el frontend (desde la carpeta raíz):

*   `npm run dev`: Inicia el servidor de desarrollo.
*   `npm run build`: Compila la aplicación para producción en la carpeta `dist`.
*   `npm run lint`: Ejecuta ESLint para analizar el código.
*   `npm run preview`: Sirve la carpeta `dist` para previsualizar la build de producción.