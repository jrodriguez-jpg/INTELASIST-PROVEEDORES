export type Rol = 'operador' | 'inspector' | 'hogar';

export interface Proveedor {
  id: string;
  nombre: string;
  empresa: string | null;
  rol: Rol[];
  provincias: string[];
  telefono?: string | null;
  correo?: string | null;
  zona?: string | null;
  notas?: string | null;
}

export interface Provincia {
  nombre: string;
  capital: string;
}

// Provincias de Panamá con sus capitales
export const PROVINCIAS: Provincia[] = [
  { nombre: 'Bocas del Toro', capital: 'Bocas del Toro' },
  { nombre: 'Coclé', capital: 'Penonomé' },
  { nombre: 'Colón', capital: 'Colón' },
  { nombre: 'Chiriquí', capital: 'David' },
  { nombre: 'Darién', capital: 'La Palma' },
  { nombre: 'Herrera', capital: 'Chitré' },
  { nombre: 'Los Santos', capital: 'Las Tablas' },
  { nombre: 'Panamá Centro', capital: '' },
  { nombre: 'Panamá Norte', capital: '' },
  { nombre: 'Panamá Este', capital: '' },
  { nombre: 'Panamá Oeste', capital: 'La Chorrera' },
  { nombre: 'Veraguas', capital: 'Santiago de Veraguas' },
];

export const NOMBRES_PROVINCIAS: string[] = PROVINCIAS.map((p) => p.nombre);

export const CAPITAL_PROVINCIA: Record<string, string> = Object.fromEntries(
  PROVINCIAS.map((p) => [p.nombre, p.capital])
);

// Sin datos de ejemplo — el usuario agregará sus contactos manualmente.
export const PROVEEDORES: Proveedor[] = [];

// Devuelve todas las provincias que tienen al menos un proveedor, en el orden de PROVINCIAS.
export function provinciasConProveedores(proveedores: Proveedor[]): string[] {
  const set = new Set<string>();
  proveedores.forEach((p) => p.provincias.forEach((pr) => set.add(pr)));
  return NOMBRES_PROVINCIAS.filter((pr) => set.has(pr));
}
