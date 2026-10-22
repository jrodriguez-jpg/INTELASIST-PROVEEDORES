import { useEffect, useState } from 'react';
import { FileText, Loader2, Mail, MapPin, Phone, Save, User, X } from 'lucide-react';
import { NOMBRES_PROVINCIAS, type Proveedor, type Rol } from '@/data/providers';
import { apiRequest } from '@/lib/api';

interface Props {
  proveedor: Proveedor | null;
  token: string;
  onClose: () => void;
  onSaved: () => void;
}

const ROLES: { id: Rol; label: string }[] = [
  { id: 'operador', label: 'Operador' },
  { id: 'inspector', label: 'Inspector' },
  { id: 'hogar', label: 'Hogar' },
];

export function EditProveedorModal({ proveedor, token, onClose, onSaved }: Props) {
  const [nombre, setNombre] = useState('');
  const [empresa, setEmpresa] = useState('');
  const [roles, setRoles] = useState<Rol[]>([]);
  const [provincias, setProvincias] = useState<string[]>([]);
  const [telefono, setTelefono] = useState('');
  const [correo, setCorreo] = useState('');
  const [zona, setZona] = useState('');
  const [notas, setNotas] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!proveedor) return;
    setNombre(proveedor.nombre);
    setEmpresa(proveedor.empresa ?? '');
    setRoles(proveedor.rol);
    setProvincias(proveedor.provincias);
    setTelefono(proveedor.telefono ?? '');
    setCorreo(proveedor.correo ?? '');
    setZona(proveedor.zona ?? '');
    setNotas(proveedor.notas ?? '');
    setError(null);
  }, [proveedor]);

  if (!proveedor) return null;

  const toggleItem = <T extends string>(items: T[], setItems: (next: T[]) => void, item: T) => {
    setItems(items.includes(item) ? items.filter((value) => value !== item) : [...items, item]);
  };

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    if (!nombre.trim() || roles.length === 0 || provincias.length === 0) {
      setError('El nombre, al menos un rol y una provincia son obligatorios.');
      return;
    }
    const basePhone = proveedor.empresa?.match(/(\d{4}-\d{4})\s*$/)?.[1];
    const contactIsBase = basePhone
      && proveedor.telefono?.replace(/\D/g, '') === basePhone.replace(/\D/g, '');
    const updatedCompany = contactIsBase
      ? [
          empresa.trim().replace(/\s*\d{4}-\d{4}\s*$/, '').trim(),
          telefono.trim(),
        ].filter(Boolean).join(' ')
      : empresa.trim();
    setSaving(true);
    try {
      await apiRequest(`/proveedores/${encodeURIComponent(proveedor.id)}`, {
        method: 'PATCH',
        token,
        body: {
          nombre: nombre.trim(),
          empresa: updatedCompany,
          rol: roles,
          provincias,
          telefono: telefono.trim(),
          correo: correo.trim(),
          zona: zona.trim(),
          notas: notas.trim(),
        },
      });
      onSaved();
      onClose();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No se pudo actualizar el contacto.');
    } finally {
      setSaving(false);
    }
  };

  const fieldCls = 'w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-sky-400 focus:ring-2 focus:ring-sky-100';

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4 backdrop-blur-sm">
      <div className="my-8 w-full max-w-2xl rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Actualizar contacto</h2>
            <p className="text-xs text-slate-500">Modifica los datos de esta base.</p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100" aria-label="Cerrar">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={submit} className="space-y-4 px-6 py-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-slate-600"><User className="h-3.5 w-3.5" /> Nombre *</span>
              <input value={nombre} onChange={(event) => setNombre(event.target.value)} className={fieldCls} required />
            </label>
            <label className="block">
              <span className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-slate-600"><Phone className="h-3.5 w-3.5" /> Teléfono</span>
              <input value={telefono} onChange={(event) => setTelefono(event.target.value)} className={fieldCls} />
            </label>
            <label className="block">
              <span className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-slate-600">Empresa / base</span>
              <input value={empresa} onChange={(event) => setEmpresa(event.target.value)} className={fieldCls} />
            </label>
            <label className="block">
              <span className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-slate-600"><Mail className="h-3.5 w-3.5" /> Correo</span>
              <input type="email" value={correo} onChange={(event) => setCorreo(event.target.value)} className={fieldCls} />
            </label>
          </div>

          <fieldset>
            <legend className="mb-1.5 text-xs font-semibold text-slate-600">Categorías *</legend>
            <div className="flex flex-wrap gap-2">
              {ROLES.map((role) => (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => toggleItem(roles, setRoles, role.id)}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium ${roles.includes(role.id) ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200'}`}
                >
                  {role.label}
                </button>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-600"><MapPin className="h-3.5 w-3.5" /> Provincias *</legend>
            <div className="grid max-h-32 grid-cols-2 gap-2 overflow-y-auto rounded-lg border border-slate-200 p-3 sm:grid-cols-3">
              {NOMBRES_PROVINCIAS.map((province) => (
                <label key={province} className="flex items-center gap-2 text-xs text-slate-700">
                  <input
                    type="checkbox"
                    checked={provincias.includes(province)}
                    onChange={() => toggleItem(provincias, setProvincias, province)}
                    className="rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                  />
                  {province}
                </label>
              ))}
            </div>
          </fieldset>

          <label className="block">
            <span className="mb-1 block text-xs font-semibold text-slate-600">Zona</span>
            <input value={zona} onChange={(event) => setZona(event.target.value)} className={fieldCls} />
          </label>

          <label className="block">
            <span className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-slate-600"><FileText className="h-3.5 w-3.5" /> Notas</span>
            <textarea value={notas} onChange={(event) => setNotas(event.target.value)} rows={3} className={`${fieldCls} resize-y`} />
          </label>

          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{error}</p>}

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <button type="button" onClick={onClose} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100">Cancelar</button>
            <button type="submit" disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-60">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
