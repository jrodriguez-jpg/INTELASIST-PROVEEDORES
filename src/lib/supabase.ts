import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY. Configura las variables de entorno de Supabase.',
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface ProveedorRow {
  id: string;
  nombre: string;
  empresa: string | null;
  rol: string[];
  provincias: string[];
  telefono: string | null;
  correo: string | null;
  zona: string | null;
  notas: string | null;
  created_at: string;
}
