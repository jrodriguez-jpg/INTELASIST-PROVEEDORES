WITH new_contacts (
  nombre,
  empresa,
  telefono,
  zona,
  notas
) AS (
  VALUES
    (
      'Jose Castañeda',
      'Servicios de Grúas JYN 6211-7612',
      '6601-3679',
      'Arraiján',
      'Contacto de empresa: Jose|PLATAFORMA – AUTOMÁTICO'
    ),
    (
      'Mauricio Reyes',
      'Servicios de Grúas JYN 6211-7612',
      '6265-5110',
      'Arraiján',
      'Contacto de empresa: Jose|PLATAFORMA – AUTOMÁTICO'
    ),
    (
      'Edilberto Tejada',
      'Servicios de Grúas JYN 6211-7612',
      '6790-8751',
      'Arraiján',
      'Contacto de empresa: Jose|PLATAFORMA – AUTOMÁTICO'
    ),
    (
      'Nielsen Pintt',
      'Sound Performance 507 6044-4234',
      '6044-4234',
      'Chorrera',
      'Contacto de empresa: Nielsen|AUTOMÁTICO|No trabaja los viernes'
    ),
    (
      'Giovanni Pulice Cossu',
      'Grúas Pulice 507 6388-8279',
      '6574-3046',
      'Chorrera',
      'Contacto de empresa: Yovannoti|PLATAFORMA|EQUIPO PESADO – COTIZACIÓN|ÚLTIMA OPCIÓN'
    ),
    (
      'Yovannoti Pulice Miranda',
      'Grúas Pulice 507 6388-8279',
      '6388-8279',
      'Chorrera',
      'Contacto de empresa: Yovannoti|PLATAFORMA|EQUIPO PESADO – COTIZACIÓN|ÚLTIMA OPCIÓN'
    ),
    (
      'Cesar Enrique Govea Olmedo',
      'Grúas Pulice 507 6388-8279',
      '6417-7649',
      'Chorrera',
      'Contacto de empresa: Yovannoti|PLATAFORMA|EQUIPO PESADO – COTIZACIÓN|ÚLTIMA OPCIÓN'
    )
)
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
  source.nombre,
  source.empresa,
  ARRAY['operador'],
  ARRAY['Panamá Oeste'],
  source.telefono,
  source.zona,
  source.notas
FROM new_contacts AS source
WHERE NOT EXISTS (
  SELECT 1
  FROM public.proveedores AS existing
  WHERE lower(trim(existing.nombre)) = lower(trim(source.nombre))
    AND regexp_replace(coalesce(existing.telefono, ''), '\D', '', 'g')
      = regexp_replace(source.telefono, '\D', '', 'g')
    AND existing.provincias @> ARRAY['Panamá Oeste']::text[]
);
