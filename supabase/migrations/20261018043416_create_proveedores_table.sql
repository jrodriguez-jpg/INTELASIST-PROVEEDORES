/*
# Create proveedores table (single-tenant, no auth)

1. New Tables
- `proveedores`
  - `id` (uuid, primary key)
  - `nombre` (text, not null) — nombre del contacto
  - `empresa` (text) — empresa o razón social
  - `rol` (text[], not null) — lista de roles: 'operador', 'inspector', 'hogar'
  - `provincias` (text[], not null) — provincias de Panamá que cubre
  - `telefono` (text) — teléfono de contacto
  - `correo` (text) — correo electrónico
  - `zona` (text) — zona o región de cobertura
  - `notas` (text) — notas adicionales
  - `created_at` (timestamptz, default now())

2. Security
- Enable RLS on `proveedores`.
- Allow anon + authenticated full CRUD because the data is intentionally shared/public
  (single-tenant directory app, no sign-in screen).

3. Notes
- La app habla con Supabase usando la anon key, sin pantalla de login.
- Todos los policies incluyen `anon` para que la app pueda leer y escribir.
*/

CREATE TABLE IF NOT EXISTS proveedores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre text NOT NULL,
  empresa text DEFAULT '',
  rol text[] NOT NULL DEFAULT '{}',
  provincias text[] NOT NULL DEFAULT '{}',
  telefono text DEFAULT '',
  correo text DEFAULT '',
  zona text DEFAULT '',
  notas text DEFAULT '',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE proveedores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_proveedores" ON proveedores;
CREATE POLICY "anon_select_proveedores" ON proveedores FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_proveedores" ON proveedores;
CREATE POLICY "anon_insert_proveedores" ON proveedores FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_proveedores" ON proveedores;
CREATE POLICY "anon_update_proveedores" ON proveedores FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_proveedores" ON proveedores;
CREATE POLICY "anon_delete_proveedores" ON proveedores FOR DELETE
  TO anon, authenticated USING (true);
