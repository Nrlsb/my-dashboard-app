/**
 * Novedades / Changelog de la plataforma.
 * Cada entrada puede tener un array de `sections` con contenido específico por rol.
 * roles: qué roles pueden ver esta novedad.
 */
export const NOVEDADES = [
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
