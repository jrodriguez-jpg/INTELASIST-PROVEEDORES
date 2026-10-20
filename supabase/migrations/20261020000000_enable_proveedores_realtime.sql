GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.proveedores TO anon, authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication
    WHERE pubname = 'supabase_realtime'
  ) THEN
    RAISE EXCEPTION 'Supabase Realtime publication does not exist';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'proveedores'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.proveedores;
  END IF;
END
$$;
