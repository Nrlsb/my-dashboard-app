/**
 * Novedades / Changelog de la plataforma.
 * Cada entrada puede tener un array de `sections` con contenido específico por rol.
 * roles: qué roles pueden ver esta novedad.
 */
export const NOVEDADES = [
  {
    id: 'nov-2026-04-06-001',
    version: '3.1.0',
    date: '2026-04-06',
    sections: [
      {
        roles: ['cliente', 'test_user'],
        tag: 'Nuevo',
        tagColor: 'blue',
        title: 'Productos Discontinuados',
        path: '/dashboard',
        buttonLabel: 'Ver en el Dashboard',
        description:
          'Ahora podés identificar rápidamente productos que están saliendo del catálogo. Buscá la nueva barra roja en tu panel principal.',
        guide: [
          'Ingresá a tu Dashboard principal.',
          'Buscá la sección "Productos Discontinuados" al final de la página.',
          'Hacé clic en cualquier producto para ver su detalle o en "Ver todos" para ir a la categoría completa.',
          'Aprovechá estos productos antes de que se agote su stock permanente.',
        ],
      },
      {
        roles: ['cliente', 'test_user'],
        tag: 'Oferta',
        tagColor: 'green',
        title: 'Sección de Ofertas',
        path: '/offers',
        buttonLabel: 'Ir a Ofertas',
        description:
          'Accedé fácilmente a todos los productos con descuentos, promociones especiales y precios de oferta.',
        guide: [
          'Hacé clic en el botón "Ir a Ofertas" o buscá el icono de etiqueta en el menú.',
          'Verás un listado de productos con sus precios originales y el precio de oferta destacado.',
          'Algunas ofertas están agrupadas por títulos especiales (ej. Promociones de Marca).',
          'Podés agregar productos directamente al carrito desde esta sección.',
        ],
      },
    ],
  },
  {
    id: 'nov-2026-03-08-001',
    version: '3.0.202',
    date: '2026-03-08',
    sections: [
      {
        roles: ['cliente', 'test_user'],
        tag: 'Guía',
        tagColor: 'blue',
        title: 'Histórico de Pedidos',
        path: '/order-history',
        buttonLabel: 'Ir a Histórico de Pedidos',
        description:
          'Consultá todos tus pedidos anteriores desde un único lugar, con filtros por estado y búsqueda rápida.',
        guide: [
          'Accedé desde el dashboard haciendo clic en el panel "Histórico de Pedidos".',
          'Verás una lista con todos tus pedidos ordenados por fecha, del más reciente al más antiguo.',
          'Usá el filtro de estado para mostrar solo pedidos: Pendiente, Confirmado, Enviado, Entregado o Cancelado.',
          'Escribí en el buscador el número de pedido o cualquier dato para encontrar uno específico.',
          'Hacé clic en el botón del ojo (Ver detalle) de cualquier pedido para ver los productos incluidos, cantidades y montos.',
        ],
      },
      {
        roles: ['vendedor'],
        tag: 'Guía',
        tagColor: 'green',
        title: 'Pedidos de Ventas',
        path: '/vendedor-pedidos-ventas',
        buttonLabel: 'Ir a Pedidos de Ventas',
        description:
          'Gestioná y hacé seguimiento de todos los pedidos de tus clientes desde un panel centralizado.',
        guide: [
          'Accedé desde tu dashboard en la sección "Pedidos de Ventas".',
          'Verás el listado completo de pedidos realizados por todos tus clientes.',
          'Filtrá por estado (Pendiente, Confirmado, etc.) o buscá por número de pedido o nombre de cliente.',
          'En cada pedido podés ingresar el Nro. de Pedido de Ventas para asociarlo a tu sistema interno.',
          'Cambiá el estado del pedido según su avance (Pendiente → Confirmado → Enviado → Entregado).',
          'Hacé clic en "Guardar Cambios" para confirmar todas las actualizaciones de una sola vez.',
          'Hacé clic en el botón del ojo (Ver detalle) para ver todos los productos, cantidades y precios del pedido.',
        ],
      },
    ],
  },
];
