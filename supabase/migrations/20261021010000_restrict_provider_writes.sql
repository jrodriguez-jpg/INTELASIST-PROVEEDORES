DROP POLICY IF EXISTS "anon_insert_proveedores" ON public.proveedores;
DROP POLICY IF EXISTS "anon_update_proveedores" ON public.proveedores;
DROP POLICY IF EXISTS "anon_delete_proveedores" ON public.proveedores;

REVOKE INSERT, UPDATE, DELETE ON TABLE public.proveedores FROM anon, authenticated;
GRANT SELECT ON TABLE public.proveedores TO anon, authenticated;

DROP POLICY IF EXISTS "anon_select_proveedores" ON public.proveedores;
CREATE POLICY "anon_select_proveedores" ON public.proveedores
  FOR SELECT
  TO anon, authenticated
  USING (true);
