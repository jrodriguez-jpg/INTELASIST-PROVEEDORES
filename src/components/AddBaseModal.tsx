import { useState } from 'react';
import { Building2, FileText, Loader2, MapPin, Phone, Plus, User, X } from 'lucide-react';
import { NOMBRES_PROVINCIAS, type Rol } from '@/data/providers';
import { apiRequest } from '@/lib/api';

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  token: string;
}

const ROLES: { id: Rol; label: string }[] = [
  { id: 'operador', label: 'Operador' },
  { id: 'inspector', label: 'Inspector' },
  { id: 'hogar', label: 'Hogar' },
];

function formatPhone(value: string) {
  const trimmed = value.trim();
  if (/^\d{3,4}-\d{4}$/.test(trimmed)) return trimmed;

  const digits = trimmed.replace(/\D/g, '');
  if (digits.length === 8) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
  if (digits.length === 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return null;
}

export function AddBaseModal({ open, onClose, onSaved, token }: Props) {
  const [empresa, setEmpresa] = useState('');
  const [telefonoBase, setTelefonoBase] = useState('');
  const [encargado, setEncargado] = useState('');
  const [provincia, setProvincia] = useState('');
  const [roles, setRoles] = useState<Rol[]>(['operador']);
  const [zona, setZona] = useState('');
  const [detalles, setDetalles] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const reset = () => {
    setEmpresa('');
    setTelefonoBase('');
    setEncargado('');
    setProvincia('');
    setRoles(['operador']);
    setZona('');
    setDetalles('');
    setError(null);
  };

  const handleClose = () => {
    if (saving) return;
    reset();
    onClose();
  };

  const toggleRole = (role: Rol) => {
    setRoles((current) => (
      current.includes(role) ? current.filter((value) => value !== role) : [...current, role]
    ));
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    const formattedPhone = formatPhone(telefonoBase);
    if (!empresa.trim() || !telefonoBase.trim() || !encargado.trim() || !provincia || roles.length === 0) {
      setError('Completa el nombre, teléfono, encargado, provincia y al menos una categoría.');
      return;
    }
    if (!formattedPhone) {
      setError('Escribe el teléfono de la base con 7 u 8 dígitos, por ejemplo 399-9191 o 6000-0000.');
      return;
    }

    const companyWithBasePhone = `${empresa.trim()} ${formattedPhone}`;
    const baseNotes = [
      `Contacto de empresa: ${encargado.trim()}`,
      detalles.trim(),
    ].filter(Boolean).join('|');

    setSaving(true);
    try {
      await apiRequest('/proveedores', {
        method: 'POST',
        token,
        body: {
          nombre: encargado.trim(),
          empresa: companyWithBasePhone,
          rol: roles,
          provincias: [provincia],
          telefono: formattedPhone,
          zona: zona.trim(),
          notas: baseNotes,
        },
      });
      reset();
      onSaved();
      onClose();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No se pudo guardar la base.');
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
              <Building2 className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-slate-900">Agregar nueva base</h2>
              <p className="text-xs text-slate-500">Registra la información principal antes de agregar contactos.</p>
            </div>
          </div>
          <button type="button" onClick={handleClose} className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600" aria-label="Cerrar">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          <label className="block">
            <span className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-slate-600">
              <Building2 className="h-3.5 w-3.5" /> Nombre de la base *
            </span>
            <input value={empresa} onChange={(event) => setEmpresa(event.target.value)} placeholder="Nombre de empresa o grúa" className={fieldCls} maxLength={180} required />
          </label>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                <Phone className="h-3.5 w-3.5" /> Teléfono de la base *
              </span>
              <input type="tel" value={telefonoBase} onChange={(event) => setTelefonoBase(event.target.value)} placeholder="Ej. 6000-0000" className={fieldCls} maxLength={30} required />
            </label>
            <label className="block">
              <span className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-slate-600">
                <User className="h-3.5 w-3.5" /> Encargado *
              </span>
              <input value={encargado} onChange={(event) => setEncargado(event.target.value)} placeholder="Nombre del encargado" className={fieldCls} maxLength={200} required />
            </label>
          </div>

          <label className="block">
            <span className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-slate-600">
              <MapPin className="h-3.5 w-3.5" /> Provincia *
            </span>
            <select value={provincia} onChange={(event) => setProvincia(event.target.value)} className={fieldCls} required>
              <option value="">Selecciona una provincia</option>
              {NOMBRES_PROVINCIAS.map((name) => <option key={name} value={name}>{name}</option>)}
            </select>
          </label>

          <fieldset>
            <legend className="mb-1.5 text-xs font-semibold text-slate-600">Categorías de servicio *</legend>
            <div className="flex flex-wrap gap-2">
              {ROLES.map((role) => (
                <button
                  key={role.id}
                  type="button"
                  onClick={() => toggleRole(role.id)}
                  aria-pressed={roles.includes(role.id)}
                  className={`rounded-lg px-3 py-1.5 text-sm font-medium ${roles.includes(role.id) ? 'bg-slate-900 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200'}`}
                >
                  {role.label}
                </button>
              ))}
            </div>
          </fieldset>

          <label className="block">
            <span className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-slate-600">
              <MapPin className="h-3.5 w-3.5" /> Zona de cobertura
            </span>
            <input value={zona} onChange={(event) => setZona(event.target.value)} placeholder="Ej. David, Chiriquí" className={fieldCls} maxLength={200} />
          </label>

          <label className="block">
            <span className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-slate-600">
              <FileText className="h-3.5 w-3.5" /> Notas de la base
            </span>
            <textarea value={detalles} onChange={(event) => setDetalles(event.target.value)} rows={2} placeholder="Horario, servicios u otra información" className={`${fieldCls} resize-y`} maxLength={1800} />
          </label>

          {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">{error}</p>}

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <button type="button" onClick={handleClose} disabled={saving} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-60">Cancelar</button>
            <button type="submit" disabled={saving || roles.length === 0} className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {saving ? 'Guardando...' : 'Guardar base'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
