# Mi Aplicación de Dashboard

Esta es una aplicación full-stack con un frontend de React y un backend de Node.js. Proporciona un dashboard para que los usuarios administren su cuenta, pedidos, productos y más.

## Características

*   **Autenticación:** Los usuarios pueden registrarse e iniciar sesión en su cuenta.
*   **Gestión de Perfil:** Los usuarios pueden ver y actualizar la información de su perfil.
*   **Saldo de Cuenta:** Los usuarios pueden ver el saldo y los movimientos de su cuenta.
*   **Gestión de Pedidos:** Los usuarios pueden crear nuevos pedidos, ver su historial de pedidos y ver los detalles de los pedidos.
*   **Catálogo de Productos:** Los usuarios pueden navegar por una lista de productos, ver detalles de productos y buscar productos.
*   **Ofertas:** Los usuarios pueden ver ofertas especiales.
*   **Consultas:** Los usuarios pueden enviar consultas.
*   **Carga de Comprobantes:** Los usuarios pueden cargar comprobantes de pago.
*   **Funciones de Administrador:**
    *   Gestionar permisos de usuario para grupos de productos.
    *   Crear notas de crédito.
    *   Ver todos los usuarios y pedidos.
    *   Activar/desactivar ofertas de productos.
    *   Gestionar la visibilidad del panel del dashboard.

## Primeros Pasos

Estas instrucciones te permitirán obtener una copia del proyecto en funcionamiento en tu máquina local para fines de desarrollo y prueba.

### Prerrequisitos

*   [Node.js](https://nodejs.org/) (v18 o posterior)
*   [npm](https://www.npmjs.com/)

### Instalación

1.  **Clona el repositorio:**

    ```bash
    git clone https://github.com/tu-usuario/my-dashboard-app.git
    cd my-dashboard-app
    ```

2.  **Instala las dependencias del frontend:**

    ```bash
    npm install
    ```

3.  **Instala las dependencias del backend:**

    ```bash
    cd backend/api
    npm install
    cd ../..
    ```

### Ejecutando la Aplicación

1.  **Inicia el servidor del backend:**

    El backend se ejecuta en `http://localhost:3001`.

    ```bash
    cd backend/api
    node server.js
    ```

2.  **Inicia el servidor de desarrollo del frontend:**

    El frontend se ejecuta en `http://localhost:5173` por defecto (revisa la salida de Vite).

    ```bash
    npm run dev
    ```

3.  Abre tu navegador y navega a la URL del frontend.

## Endpoints de la API

La API del backend tiene el prefijo `/api`.

*   **Autenticación:**
    *   `POST /login`: Autenticar un usuario.
    *   `POST /register`: Registrar un nuevo usuario.
*   **Perfil:**
    *   `GET /profile`: Obtener el perfil del usuario.
    *   `PUT /profile`: Actualizar el perfil del usuario.
*   **Saldo de Cuenta:**
    *   `GET /balance`: Obtener el saldo de la cuenta.
    *   `GET /movements`: Obtener los movimientos de la cuenta.
*   **Pedidos:**
    *   `GET /orders`: Obtener todos los pedidos del usuario.
    *   `GET /orders/:id`: Obtener detalles del pedido.
    *   `POST /orders`: Crear un nuevo pedido.
*   **Productos:**
    *   `GET /products`: Obtener una lista paginada de productos.
    *   `GET /products/:id`: Obtener detalles del producto.
    *   `GET /brands`: Obtener una lista de todas las marcas.
    *   `GET /offers`: Obtener una lista de todas las ofertas.
*   **Administrador:**
    *   `POST /credit-note`: Crear una nota de crédito.
    *   `GET /customer-invoices/:cod`: Obtener facturas de un cliente.
    *   `GET /admin/order-details/:id`: Obtener detalles de cualquier pedido.
    *   `GET /admin/users`: Obtener una lista de todos los usuarios.
    *   `GET /admin/product-groups`: Obtener una lista de todos los grupos de productos.
    *   `GET /admin/users/:userId/product-groups`: Obtener permisos de grupo de productos para un usuario.
    *   `PUT /admin/users/:userId/product-groups`: Actualizar permisos de grupo de productos para un usuario.
    *   `PUT /products/:id/toggle-offer`: Activar/desactivar el estado de oferta de un producto.
    *   `GET /dashboard-panels`: Obtener paneles de dashboard visibles.
    *   `GET /admin/dashboard-panels`: Obtener todos los paneles de dashboard.
    *   `PUT /admin/dashboard-panels/:id`: Actualizar la visibilidad de un panel de dashboard.
*   **Carga de Archivos:**
    *   `POST /upload-voucher`: Cargar un comprobante de pago.
*   **Consultas:**
    *   `POST /queries`: Enviar una nueva consulta.

## Tecnologías Utilizadas

### Frontend

*   [React](https://reactjs.org/)
*   [Vite](https://vitejs.dev/)
*   [React Router](https://reactrouter.com/)
*   [@tanstack/react-query](https://tanstack.com/query/latest)
*   [Lucide React](https://lucide.dev/guide/react)
*   [ESLint](https://eslint.org/)

### Backend

*   [Node.js](https://nodejs.org/)
*   [Express](https://expressjs.com/)
*   [PostgreSQL](https://www.postgresql.org/) (controlador `pg`)
*   [bcryptjs](https://www.npmjs.com/package/bcryptjs) para el hash de contraseñas.
*   [Multer](https://github.com/expressjs/multer) para la carga de archivos.
*   [CORS](https://expressjs.com/en/resources/middleware/cors.html)
*   [dotenv](https://www.npmjs.com/package/dotenv) para variables de entorno.