# Pintureria Mercurio - Dashboard de Cliente

Este proyecto es una aplicación web de tipo dashboard desarrollada en React, diseñada para que los clientes de Pintureria Mercurio puedan gestionar sus cuentas, pedidos e interactuar con la empresa.

La aplicación está construida con [Vite](https://vitejs.dev/) y estilizada con [Tailwind CSS](https://tailwindcss.com/).

## Características Principales

La aplicación simula un portal de cliente completo, permitiendo la navegación entre varias secciones clave:

* **Login:** Página de autenticación para el ingreso de clientes.
* **Dashboard Principal:** Un panel central con accesos directos a todas las funcionalidades.
* **Nuevo Pedido:** Interfaz para la creación de nuevos pedidos (actualmente con filtros de búsqueda).
* **Histórico de Pedidos:** Muestra una tabla con el historial de pedidos del cliente y sus estados (Entregado, Pendiente, etc.).
* **Lista de Precios:** Permite buscar y filtrar productos para consultar precios.
* **Ofertas:** Muestra las ofertas y promociones vigentes.
* **Cuenta Corriente:** Presenta un resumen del saldo de la cuenta del cliente (total, disponible, pendiente) y los últimos movimientos.
* **Consultas:** Un formulario para que el cliente pueda enviar consultas o reclamos.
* **Carga de Comprobantes:** Una interfaz para arrastrar y soltar (drag-and-drop) archivos (PDF, JPG, PNG) y subirlos.

## Tech Stack (Tecnologías Utilizadas)

* **Framework:** React 19
* **Bundler:** Vite
* **Estilos:** Tailwind CSS (cargado vía CDN)
* **Iconos:** `lucide-react`
* **Linting:** ESLint

## Estructura del Proyecto

El proyecto está organizado de la siguiente manera:

¡Ah, entiendo perfectamente!

Tienes razón. Lo que ves a la derecha es el archivo README.md renderizado. Como es un archivo .md, el editor lo formatea automáticamente para que se vea bonito (como en GitHub).

Si lo que quieres es el código Markdown literal (el texto crudo con los ##, * y los bloques de código ````), aquí te lo muestro en el chat para que lo puedas ver y copiar:

Markdown

# Pintureria Mercurio - Dashboard de Cliente

Este proyecto es una aplicación web de tipo dashboard desarrollada en React, diseñada para que los clientes de Pintureria Mercurio puedan gestionar sus cuentas, pedidos e interactuar con la empresa.

La aplicación está construida con [Vite](https://vitejs.dev/) y estilizada con [Tailwind CSS](https://tailwindcss.com/).

## Características Principales

La aplicación simula un portal de cliente completo, permitiendo la navegación entre varias secciones clave:

* **Login:** Página de autenticación para el ingreso de clientes.
* **Dashboard Principal:** Un panel central con accesos directos a todas las funcionalidades.
* **Nuevo Pedido:** Interfaz para la creación de nuevos pedidos (actualmente con filtros de búsqueda).
* **Histórico de Pedidos:** Muestra una tabla con el historial de pedidos del cliente y sus estados (Entregado, Pendiente, etc.).
* **Lista de Precios:** Permite buscar y filtrar productos para consultar precios.
* **Ofertas:** Muestra las ofertas y promociones vigentes.
* **Cuenta Corriente:** Presenta un resumen del saldo de la cuenta del cliente (total, disponible, pendiente) y los últimos movimientos.
* **Consultas:** Un formulario para que el cliente pueda enviar consultas o reclamos.
* **Carga de Comprobantes:** Una interfaz para arrastrar y soltar (drag-and-drop) archivos (PDF, JPG, PNG) y subirlos.

## Tech Stack (Tecnologías Utilizadas)

* **Framework:** React 19
* **Bundler:** Vite
* **Estilos:** Tailwind CSS (cargado vía CDN)
* **Iconos:** `lucide-react`
* **Linting:** ESLint

## Estructura del Proyecto

El proyecto está organizado de la siguiente manera:

/src |-- /components | |-- DashboardCard.jsx (Componente reutilizable para las tarjetas del menú) | +-- Header.jsx (Cabecera principal de la aplicación) |-- /pages | |-- AccountBalancePage.jsx | |-- DashboardPage.jsx | |-- LoginPage.jsx | |-- NewOrderPage.jsx | |-- OffersPage.jsx | |-- OrderHistoryPage.jsx | |-- PriceListPage.jsx | |-- QueriesPage.jsx | +-- VoucherUploadPage.jsx +-- App.jsx (Manejador principal de estado y navegación) +-- main.jsx (Punto de entrada de React)

La navegación se maneja a través de un estado simple en `App.jsx`, que renderiza condicionalmente cada componente de página basado en el estado `currentView`.

## Instalación y Scripts

Para correr este proyecto localmente, sigue estos pasos:

1.  **Clonar el repositorio:**
    ```bash
    git clone [URL-DEL-REPOSITORIO]
    cd my-dashboard-app
    ```

2.  **Instalar dependencias:**
    (Se recomienda usar `npm` o `yarn` según el `package-lock.json`)
    ```bash
    npm install
    ```

3.  **Correr el servidor de desarrollo:**
    Inicia la aplicación en modo de desarrollo con Vite.
    ```bash
    npm run dev
    ```
    La aplicación estará disponible en `http://localhost:5173` (o el puerto que indique Vite).

### Otros Scripts Disponibles

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