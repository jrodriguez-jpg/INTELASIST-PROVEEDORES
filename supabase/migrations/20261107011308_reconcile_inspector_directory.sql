UPDATE public.proveedores
SET empresa = replace(empresa, 'Servi Exprexx Vial', 'Servi Express Vial')
WHERE empresa = 'Servi Exprexx Vial 6568-3028'
  AND 'inspector' = ANY(rol);

INSERT INTO public.proveedores (
  nombre,
  empresa,
  rol,
  provincias,
  telefono,
  zona,
  notas
)
SELECT
  'Heinstein Javier Castillos',
  'Servi Express Vial 6568-3028',
  ARRAY['inspector'],
  ARRAY['Panamá Centro'],
  '6141-6944',
  'Brisas del Golf',
  'Contacto de empresa: Alexis Abdel Serrano | Automático'
WHERE NOT EXISTS (
  SELECT 1
  FROM public.proveedores
  WHERE lower(trim(nombre)) = lower(trim('Heinstein Javier Castillos'))
    AND regexp_replace(coalesce(telefono, ''), '\D', '', 'g') = '61416944'
    AND provincias @> ARRAY['Panamá Centro']::text[]
);
