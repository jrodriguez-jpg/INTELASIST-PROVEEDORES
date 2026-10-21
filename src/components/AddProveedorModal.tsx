import { useMemo, useState } from 'react';
import { X, User, Building2, Phone, Mail, MapPin, FileText, Plus, Loader2 } from 'lucide-react';
import { NOMBRES_PROVINCIAS, type Proveedor } from '@/data/providers';
import { supabase } from '@/lib/supabase';

export type Rol = 'operador' | 'inspector' | 'hogar';

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  proveedores: Proveedor[];
}

const ROLES: { id: Rol; label: string }[] = [
  { id: 'operador', label: 'Operador' },
  { id: 'inspector', label: 'Inspector' },
  { id: 'hogar', label: 'Hogar' },
];

export function AddProveedorModal({ open, onClose, onSaved, proveedores }: Props) {
  const [nombre, setNombre] = useState('');
  const [empresa, setEmpresa] = useState('');
  const [provincia, setProvincia] = useState('');
  const [baseSeleccionada, setBaseSeleccionada] = useState('');
  const [roles, setRoles] = useState<Rol[]>([]);
  const [telefono, setTelefono] = useState('');
  const [correo, setCorreo] = useState('');
  const [zona, setZona] = useState('');
  const [notas, setNotas] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bases = useMemo(() => {
    const porEmpresa = new Map<string, { key: string; empresa: string; zona: string }>();
    proveedores.forEach((proveedor) => {
      const nombreEmpresa = proveedor.empresa?.trim().replace(/\s+/g, ' ');
      if (!nombreEmpresa || !proveedor.provincias.includes(provincia)) return;

      const key = nombreEmpresa.toLocaleLowerCase('es');
      const existente = porEmpresa.get(key);
      if (!existente) {
        porEmpresa.set(key, { key, empresa: nombreEmpresa, zona: proveedor.zona ?? '' });
      } else if (!existente.zona && proveedor.zona) {
        existente.zona = proveedor.zona;
      }
    });
    return [...porEmpresa.values()].sort((a, b) => a.empresa.localeCompare(b.empresa, 'es'));
  }, [proveedores, provincia]);

  if (!open) return null;

  const reset = () => {
    setNombre('');
    setEmpresa('');
    setProvincia('');
    setBaseSeleccionada('');
    setRoles([]);
    setTelefono('');
    setCorreo('');
    setZona('');
    setNotas('');
    setError(null);
  };

  const toggleRol = (r: Rol) => {
    setRoles((prev) => (prev.includes(r) ? prev.filter((x) => x !== r) : [...prev, r]));
  };

  const seleccionarBase = (value: string) => {
    setBaseSeleccionada(value);
    const base = bases.find((opcion) => opcion.key === value);
    setEmpresa(base?.empresa ?? '');
    setZona(base?.zona ?? '');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!nombre.trim()) {
      setError('El nombre es obligatorio.');
      return;
    }
    if (roles.length === 0) {
      setError('Selecciona al menos un rol (Operador, Inspector u Hogar).');
      return;
    }
    if (!provincia) {
      setError('Selecciona una provincia.');
      return;
    }
    if (!baseSeleccionada) {
      setError('Selecciona una base existente o indica que deseas registrar una nueva.');
      return;
    }
    if (baseSeleccionada === '__nueva_base__' && !empresa.trim()) {
      setError('Escribe el nombre de la nueva base.');
      return;
    }

    setSaving(true);

    const { error: insertError } = await supabase.from('proveedores').insert({
      nombre: nombre.trim(),
      empresa: empresa.trim(),
      rol: roles,
      provincias: [provincia],
      telefono: telefono.trim() || null,
      correo: correo.trim() || null,
      zona: zona.trim() || null,
      notas: notas.trim() || null,
    });

    setSaving(false);

    if (insertError) {
      setError('No se pudo guardar el contacto. Intenta de nuevo.');
      return;
    }

    reset();
    onSaved();
    onClose();
  };

  const fieldCls =
    'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 placeholder:text-slate-400 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100';

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 backdrop-blur-sm">
      <div className="my-8 w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-sky-50 text-sky-600">
              <Plus className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">Agregar contacto</h2>
              <p className="text-xs text-slate-500">Completa los datos del nuevo proveedor.</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="space-y-5 px-6 py-5">
          {/* Nombre */}
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                <User className="h-3.5 w-3.5" /> Nombre *
              </span>
              <input
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Nombre completo"
                className={fieldCls}
              />
            </label>
            <div className="rounded-lg border border-sky-100 bg-sky-50/70 px-3 py-2.5 text-xs leading-relaxed text-sky-900">
              Elige la provincia y la base para que el contacto quede asociado al grupo correcto.
            </div>
          </div>

          {/* Roles */}
          <div>
            <span className="mb-1.5 block text-xs font-semibold text-slate-600">Rol *</span>
            <div className="flex flex-wrap gap-2">
              {ROLES.map((r) => {
                const active = roles.includes(r.id);
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => toggleRol(r.id)}
                    className={`rounded-lg px-3.5 py-2 text-sm font-medium transition-all ${
                      active
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    {r.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Provincia y base */}
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                <MapPin className="h-3.5 w-3.5" /> Provincia *
              </span>
              <select
                value={provincia}
                onChange={(e) => {
                  setProvincia(e.target.value);
                  setBaseSeleccionada('');
                  setEmpresa('');
                  setZona('');
                }}
                className={fieldCls}
              >
                <option value="">Selecciona una provincia</option>
                {NOMBRES_PROVINCIAS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                <Building2 className="h-3.5 w-3.5" /> Base *
              </span>
              <select
                value={baseSeleccionada}
                onChange={(e) => seleccionarBase(e.target.value)}
                disabled={!provincia}
                className={`${fieldCls} disabled:cursor-not-allowed disabled:bg-slate-100`}
              >
                <option value="">{provincia ? 'Selecciona una base' : 'Primero selecciona una provincia'}</option>
                {bases.map((base) => (
                  <option key={base.key} value={base.key}>
                    {base.empresa}{base.zona ? ` · ${base.zona}` : ''}
                  </option>
                ))}
                {provincia && <option value="__nueva_base__">+ Registrar una nueva base</option>}
              </select>
            </label>
          </div>

          {baseSeleccionada === '__nueva_base__' && (
            <label className="block">
              <span className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                <Building2 className="h-3.5 w-3.5" /> Nombre de la nueva base *
              </span>
              <input
                value={empresa}
                onChange={(e) => setEmpresa(e.target.value)}
                placeholder="Empresa o razón social"
                className={fieldCls}
              />
            </label>
          )}

          {/* Teléfono + Correo */}
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                <Phone className="h-3.5 w-3.5" /> Teléfono
              </span>
              <input
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                placeholder="507-600-0000"
                className={fieldCls}
              />
            </label>
            <label className="block">
              <span className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                <Mail className="h-3.5 w-3.5" /> Correo
              </span>
              <input
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                placeholder="correo@empresa.com"
                className={fieldCls}
              />
            </label>
          </div>

          {/* Zona */}
          <label className="block">
            <span className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-slate-600">
              <MapPin className="h-3.5 w-3.5" /> Zona de cobertura
            </span>
            <input
              value={zona}
              onChange={(e) => setZona(e.target.value)}
              placeholder="Ej. Área Metropolitana"
              className={fieldCls}
            />
          </label>

          {/* Notas */}
          <label className="block">
            <span className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-slate-600">
              <FileText className="h-3.5 w-3.5" /> Notas
            </span>
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              rows={2}
              placeholder="Información adicional..."
              className={`${fieldCls} resize-none`}
            />
          </label>

          {error && (
            <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200">
              {error}
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {saving ? 'Guardando...' : 'Guardar contacto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
