# INTELASIST Proveedores

Aplicación React + Vite que usa Supabase como base de datos.

## Desarrollo local

1. Instala Node.js 20 o posterior.
2. Copia `.env.example` a `.env`. Configura las variables `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `VIEWER_ACCESS_CODE`, `ADMIN_ACCESS_CODE` y `SESSION_SECRET`.
3. Ejecuta `npm ci`.
4. Inicia el API con `npm run dev:server` y la interfaz con `npm run dev` en dos terminales.

## Despliegue

### Supabase

La interfaz usa `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` únicamente para leer el directorio y recibir cambios en tiempo real. La clave `anon` es pública. Las escrituras se realizan exclusivamente en el backend Node y la clave `service_role` solo se configura como secreto del servidor; nunca la pongas en una variable `VITE_*`, en el código del navegador ni en Git.

Aplica las migraciones en orden en el SQL Editor de Supabase:

1. `supabase/migrations/20261018043416_create_proveedores_table.sql` crea la tabla persistente `public.proveedores` con nombre, empresa, teléfono y los demás campos del directorio.
2. `supabase/migrations/20261020000000_enable_proveedores_realtime.sql` habilita los permisos de la aplicación y agrega la tabla a Supabase Realtime.
3. `supabase/migrations/20261021010000_restrict_provider_writes.sql` revoca INSERT, UPDATE y DELETE a `anon` y `authenticated`; las escrituras autorizadas pasan por el backend.

Aplica la tercera migración después de desplegar el nuevo backend y actualizar los frontends públicos (Render y Vercel, si ambos se usan). Confirma que el inicio de sesión funciona en cada dominio antes de revocar las escrituras directas del navegador.

El directorio agrupa los contactos por empresa y provincia. Cada ficha muestra la empresa, el teléfono base, la zona y el encargado en un encabezado visual, seguido de etiquetas de servicio y una lista de contactos con sus teléfonos directos. Una misma empresa puede conservar fichas en varias provincias. Las tarjetas usan animaciones sutiles y respetan la preferencia del sistema por movimiento reducido.

### Acceso y permisos

La pantalla de inicio solicita un código general:

- El código de solo lectura permite ver el directorio sin controles de creación, edición o eliminación.
- El código de administración habilita agregar contactos y bases, editar contactos y borrar registros.

Las sesiones tienen una vigencia de 12 horas. El backend valida cada operación de escritura, por lo que ocultar controles en el navegador no es la única barrera. Configura `VIEWER_ACCESS_CODE`, `ADMIN_ACCESS_CODE` y un `SESSION_SECRET` aleatorio de al menos 32 caracteres como secretos del servidor. Los dos códigos deben ser distintos. No guardes los códigos reales en `.env.example`, Git, Vercel ni variables `VITE_*`.

### Vercel

Importa el repositorio de GitHub en Vercel y configura `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` y `VITE_API_URL`. `VITE_API_URL` debe ser la URL pública del backend Node en Render, sin una barra final. En el backend de Render, configura `ALLOWED_ORIGIN` con el origen exacto `https://intelasist-proveedores.vercel.app` (sin ruta ni barra final). Para varios dominios, `APP_ORIGINS` acepta una lista separada por comas; se conserva por compatibilidad con la configuración anterior. No pongas secretos del servidor en Vercel.

### Render

Despliega un servicio web Node desde el repositorio; Render puede detectar `render.yaml`. Configura `VITE_API_URL` con la URL pública del propio servicio (para el frontend servido por Render), las variables públicas `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`, los secretos `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `VIEWER_ACCESS_CODE`, `ADMIN_ACCESS_CODE` y `SESSION_SECRET`, y `ALLOWED_ORIGIN=https://intelasist-proveedores.vercel.app`. Si se permiten otros dominios, configura `APP_ORIGINS` como una lista exacta de orígenes separados por comas. Si ya existe un servicio Render de tipo Static Site, crea un servicio Web Node nuevo porque Render no permite cambiar el tipo del servicio existente.

La autenticación usa un token Bearer firmado, no cookies; no se habilita `Access-Control-Allow-Credentials`. El backend atiende solicitudes `OPTIONS` antes de validar sesiones. Las respuestas de la API para un origen permitido mantienen las cabeceras CORS, incluso cuando la ruta devuelve un error.

### GitHub

El workflow `.github/workflows/ci.yml` ejecuta lint, verificación de tipos y compilación en cada push y pull request a `main`.
