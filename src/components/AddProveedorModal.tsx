import { useMemo, useState } from 'react';
import { Building2, Loader2, Phone, Plus, User, X } from 'lucide-react';
import type { Proveedor } from '@/data/providers';
import { apiRequest } from '@/lib/api';

interface BaseOption {
  key: string;
  empresa: string;
  provincia: string;
  telefono: string;
  zona: string;
  rol: Proveedor['rol'];
  notas: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  proveedores: Proveedor[];
  token: string;
}

function getBaseOptions(proveedores: Proveedor[]): BaseOption[] {
  const bases = new Map<string, BaseOption>();

  proveedores.forEach((proveedor) => {
    const empresaCompleta = proveedor.empresa?.trim().replace(/\s+/g, ' ');
    if (!empresaCompleta) return;

    const basePhone = empresaCompleta.match(/(\d{3,4}-\d{4})\s*$/)?.[1];
    const empresa = empresaCompleta.replace(/\s*\d{3,4}-\d{4}\s*$/, '').trim() || empresaCompleta;
    const contactoBase = proveedor.notas?.match(/Contacto de empresa:\s*([^|]+)/i)?.[1]?.trim();

    proveedor.provincias.forEach((provincia) => {
      const key = `${empresaCompleta.toLocaleLowerCase('es')}|${provincia}`;
      const existing = bases.get(key);
      if (existing) {
        proveedor.rol.forEach((rol) => {
          if (!existing.rol.includes(rol)) existing.rol.push(rol);
        });
        if (!existing.zona && proveedor.zona) existing.zona = proveedor.zona;
        if (!existing.notas && proveedor.notas) existing.notas = proveedor.notas;
        if (!existing.telefono && (basePhone || contactoBase)) {
          existing.telefono = basePhone ?? proveedor.telefono ?? '';
        }
        return;
      }

      bases.set(key, {
        key,
        empresa,
        provincia,
        telefono: basePhone ?? (contactoBase ? proveedor.telefono ?? '' : ''),
        zona: proveedor.zona ?? '',
        rol: [...proveedor.rol],
        notas: proveedor.notas ?? '',
      });
    });
  });

  return [...bases.values()].sort((a, b) => (
    a.provincia.localeCompare(b.provincia, 'es') || a.empresa.localeCompare(b.empresa, 'es')
  ));
}

export function AddProveedorModal({ open, onClose, onSaved, proveedores, token }: Props) {
  const bases = useMemo(() => getBaseOptions(proveedores), [proveedores]);
  const [nombre, setNombre] = useState('');
  const [baseSeleccionada, setBaseSeleccionada] = useState('');
  const [telefono, setTelefono] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const reset = () => {
    setNombre('');
    setBaseSeleccionada('');
    setTelefono('');
    setError(null);
  };

  const handleClose = () => {
    if (saving) return;
    reset();
    onClose();
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const base = bases.find((option) => option.key === baseSeleccionada);
    if (!nombre.trim() || !baseSeleccionada || !telefono.trim()) {
      setError('Completa el nombre, la base y el teléfono del contacto.');
      return;
    }
    if (!base) {
      setError('La base seleccionada ya no está disponible. Actualiza el directorio e inténtalo de nuevo.');
      return;
    }

    const empresaCompleta = base.telefono
      ? `${base.empresa} ${base.telefono}`
      : base.empresa;
    setSaving(true);
    try {
      await apiRequest('/proveedores', {
        method: 'POST',
        token,
        body: {
          nombre: nombre.trim(),
          empresa: empresaCompleta,
          rol: base.rol,
          provincias: [base.provincia],
          telefono: telefono.trim(),
          zona: base.zona,
          notas: base.notas,
        },
      });
      reset();
      onSaved();
      onClose();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No se pudo guardar el contacto.');
    } finally {
      setSaving(false);
    }
  };

  const fieldCls = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100';

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 backdrop-blur-sm">
      <div className="my-8 w-full max-w-xl rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-sky-50 text-sky-600">
              <User className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">Agregar contacto</h2>
              <p className="text-xs text-slate-500">Asocia una persona a una base existente.</p>
            </div>
          </div>
          <button type="button" onClick={handleClose} className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600" aria-label="Cerrar">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 px-6 py-5">
          <label className="block">
            <span className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-slate-600">
              <User className="h-3.5 w-3.5" /> Nombre del contacto *
            </span>
            <input value={nombre} onChange={(event) => setNombre(event.target.value)} placeholder="Nombre completo" className={fieldCls} maxLength={200} required />
          </label>

          <label className="block">
            <span className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-slate-600">
              <Building2 className="h-3.5 w-3.5" /> Base *
            </span>
            <select value={baseSeleccionada} onChange={(event) => setBaseSeleccionada(event.target.value)} className={fieldCls} required>
              <option value="">Selecciona la base</option>
              {bases.map((base) => (
                <option key={base.key} value={base.key}>
                  {base.provincia} · {base.empresa}{base.telefono ? ` · ${base.telefono}` : ''}
                </option>
              ))}
            </select>
            {bases.length === 0 && (
              <span className="mt-1 block text-xs text-amber-700">Primero registra una base para poder agregar contactos.</span>
            )}
          </label>

          <label className="block">
            <span className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-slate-600">
              <Phone className="h-3.5 w-3.5" /> Teléfono del contacto *
            </span>
            <input type="tel" value={telefono} onChange={(event) => setTelefono(event.target.value)} placeholder="Ej. 6000-0000" className={fieldCls} maxLength={30} required />
          </label>

          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{error}</p>}

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <button type="button" onClick={handleClose} disabled={saving} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-60">Cancelar</button>
            <button type="submit" disabled={saving || bases.length === 0} className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {saving ? 'Guardando...' : 'Guardar contacto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
