-- Añade una restricción UNIQUE a la columna navigation_path si no existe
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'dashboard_panels_navigation_path_key'
    AND conrelid = 'public.dashboard_panels'::regclass
  ) THEN
    ALTER TABLE public.dashboard_panels
    ADD CONSTRAINT dashboard_panels_navigation_path_key UNIQUE (navigation_path);
  END IF;
END;
$$;

-- Sincroniza la secuencia de IDs para evitar errores de clave duplicada
-- Esto asegura que el próximo ID generado sea mayor que el máximo ID existente
SELECT setval('dashboard_panels_id_seq', (SELECT COALESCE(MAX(id), 1) FROM dashboard_panels), true);


-- Insertamos los paneles específicos para el dashboard del vendedor
-- Si ya existen por 'navigation_path', actualizamos sus datos para mantenerlos consistentes
INSERT INTO public.dashboard_panels (title, subtitle, icon, navigation_path, tag, is_visible)
VALUES
('Cuentas Corrientes', 'Consulta los saldos y movimientos de tus clientes.', 'credit-card', '/vendedor-cuentas-corrientes', 'vendedor', true),
('Pedidos de Ventas', 'Visualiza el historial de pedidos y crea nuevos.', 'shopping-cart', '/vendedor-pedidos-ventas', 'vendedor', true),
('Clientes', 'Gestiona y visualiza la información detallada de tus clientes.', 'users', '/vendedor-clients', 'vendedor', true),
('Lista de Precios', 'Consulta la lista de precios actualizada.', 'dollar-sign', '/vendedor-price-list', 'vendedor', true),
('Ofertas Vendedor', 'Explora los productos con descuentos especiales.', 'gift', '/offers', 'vendedor', true)
ON CONFLICT (navigation_path) DO UPDATE SET
  title = EXCLUDED.title,
  subtitle = EXCLUDED.subtitle,
  icon = EXCLUDED.icon,
  tag = EXCLUDED.tag,
  is_visible = EXCLUDED.is_visible;
