# INTELASIST Proveedores

Aplicación React + Vite que usa Supabase como base de datos.

## Desarrollo local

1. Instala Node.js 20 o posterior.
2. Copia `.env.example` a `.env` y configura `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` desde el panel de tu proyecto Supabase.
3. Ejecuta `npm ci` y luego `npm run dev`.

## Despliegue

### Supabase

Configura las dos variables anteriores en el entorno de compilación de cada hosting. La clave `anon` es pública y puede estar en el cliente; nunca uses `service_role` en esta aplicación.

Aplica `supabase/migrations/20261018043416_create_proveedores_table.sql` en el SQL Editor de Supabase antes de publicar.

**Importante:** las políticas actuales permiten que cualquier visitante anónimo lea, cree, modifique y elimine proveedores. Publica solo si esa es la política de acceso deseada.

### Vercel

Importa el repositorio de GitHub en Vercel y añade `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` a las variables de entorno. La configuración de compilación y las rutas SPA están en `vercel.json`.

### Render

Crea un Static Site desde el repositorio; Render puede detectar `render.yaml`. Añade los valores de `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` cuando los solicite. El manifiesto define la compilación, `dist` y el rewrite de la SPA.

### GitHub

El workflow `.github/workflows/ci.yml` ejecuta lint, verificación de tipos y compilación en cada push y pull request a `main`.
