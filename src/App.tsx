import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Cpu, MapPin, Wrench, SearchCheck, Home, Building2, Phone, UserRound,
  ChevronRight, X, Plus, Loader2, Trash2, AlertCircle, Check,
} from 'lucide-react';
import {
  NOMBRES_PROVINCIAS, CAPITAL_PROVINCIA, provinciasConProveedores,
  type Proveedor, type Rol,
} from '@/data/providers';
import { supabase, type ProveedorRow } from '@/lib/supabase';
import { AddProveedorModal } from '@/components/AddProveedorModal';

type Filtro = Rol;

const FILTROS: { id: Filtro; label: string; icon: typeof Wrench }[] = [
  { id: 'operador', label: 'Operadores', icon: Wrench },
  { id: 'inspector', label: 'Inspectores', icon: SearchCheck },
  { id: 'hogar', label: 'Hogar', icon: Home },
];

function rowToProveedor(r: ProveedorRow): Proveedor {
  return {
    id: r.id,
    nombre: r.nombre,
    empresa: r.empresa,
    rol: r.rol as Rol[],
    provincias: r.provincias,
    telefono: r.telefono,
    correo: r.correo,
    zona: r.zona,
    notas: r.notas,
  };
}

interface GrupoEmpresa {
  id: string;
  empresa: string;
  telefonoBase: string | null;
  encargado: string | null;
  zonas: string[];
  provincias: string[];
  detalles: string[];
  contactos: Proveedor[];
}

function crearGruposEmpresa(proveedores: Proveedor[]): GrupoEmpresa[] {
  const grupos = new Map<string, Proveedor[]>();

  proveedores.forEach((proveedor) => {
    const empresaNormalizada = proveedor.empresa?.trim().replace(/\s+/g, ' ').toLocaleLowerCase('es');
    const provincias = [...proveedor.provincias].sort();
    const id = empresaNormalizada
      ? `${empresaNormalizada}|${provincias.join('|')}`
      : proveedor.id;
    const contactos = grupos.get(id) ?? [];
    contactos.push(proveedor);
    grupos.set(id, contactos);
  });

  return [...grupos.entries()].map(([id, contactos]) => {
    const empresaCompleta = contactos[0].empresa?.trim().replace(/\s+/g, ' ') ?? 'Contacto';
    const telefonoBase = empresaCompleta.match(/(\d{4}-\d{4})\s*$/)?.[1] ?? null;
    const empresa = empresaCompleta.replace(/\s*\d{4}-\d{4}\s*$/, '').trim() || empresaCompleta;
    const encargadoEnNotas = contactos
      .map((contacto) => contacto.notas?.match(/Contacto de empresa:\s*([^|]+)/i)?.[1]?.trim())
      .find((nombre): nombre is string => Boolean(nombre));
    const contactoBase = contactos.find(
      (contacto) =>
        telefonoBase &&
        contacto.telefono?.replace(/[^\d]/g, '') === telefonoBase.replace(/[^\d]/g, ''),
    );
    const zonasMap = new Map<string, string>();
    const detallesMap = new Map<string, string>();

    contactos.forEach((contacto) => {
      contacto.zona?.split(/\s*\/\s*/).forEach((zona) => {
        const limpia = zona.trim();
        if (limpia) zonasMap.set(limpia.toLocaleLowerCase('es'), limpia);
      });

      contacto.notas
        ?.replace(/Contacto de empresa:\s*[^|]+/i, '')
        .split('|')
        .map((detalle) => detalle.trim())
        .filter(Boolean)
        .forEach((detalle) => detallesMap.set(detalle.toLocaleLowerCase('es'), detalle));
    });

    return {
      id,
      empresa,
      telefonoBase,
      encargado: encargadoEnNotas ?? contactoBase?.nombre ?? null,
      zonas: [...zonasMap.values()],
      provincias: [...new Set(contactos.flatMap((contacto) => contacto.provincias))],
      detalles: [...detallesMap.values()],
      contactos: [...contactos].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es')),
    };
  });
}

function Logo() {
  return (
    <div className="flex items-center gap-3 px-5 py-6">
      <div className="relative grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-sky-500 to-cyan-600 shadow-lg shadow-sky-500/30">
        <Cpu className="h-6 w-6 text-white" strokeWidth={2.2} />
        <span className="absolute -bottom-1 -right-1 grid h-5 w-5 place-items-center rounded-full bg-slate-900 text-[9px] font-bold text-sky-300 ring-2 ring-slate-900">
          IA
        </span>
      </div>
      <div className="leading-tight">
        <div className="text-[15px] font-bold tracking-tight text-white">INTELASIST</div>
        <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-sky-400/80">
          Proveedores
        </div>
      </div>
    </div>
  );
}

function ProvinciaItem({
  provincia, count, active, onClick,
}: { provincia: string; count: number; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`group flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm transition-all duration-200 ${
        active
          ? 'bg-sky-500/15 text-white shadow-[inset_2px_0_0_0_#0ea5e9]'
          : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-100'
      }`}
    >
      <MapPin
        className={`h-4 w-4 shrink-0 transition-colors ${
          active ? 'text-sky-400' : 'text-slate-500 group-hover:text-slate-300'
        }`}
        strokeWidth={2}
      />
      <span className="flex-1 truncate font-medium leading-tight">{provincia}</span>
      <span
        className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums transition-colors ${
          active
            ? 'bg-sky-500/25 text-sky-200'
            : 'bg-slate-800 text-slate-500 group-hover:bg-slate-700 group-hover:text-slate-300'
        }`}
      >
        {count}
      </span>
    </button>
  );
}

function EmpresaCard({
  grupo,
  deletingId,
  onDelete,
}: {
  grupo: GrupoEmpresa;
  deletingId: string | null;
  onDelete: (id: string) => void;
}) {
  const [copiedPhone, setCopiedPhone] = useState<string | null>(null);
  const [copyError, setCopyError] = useState<string | null>(null);

  const copiarTelefono = async (telefono: string) => {
    try {
      await navigator.clipboard.writeText(telefono);
      setCopiedPhone(telefono);
      setCopyError(null);
      window.setTimeout(() => {
        setCopiedPhone((current) => (current === telefono ? null : current));
      }, 1500);
    } catch (error) {
      console.error('No se pudo copiar el teléfono:', error);
      setCopiedPhone(null);
      setCopyError(telefono);
    }
  };

  return (
    <article className="company-card-enter group overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:border-sky-200 hover:shadow-xl hover:shadow-slate-200/70">
      <header className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-sky-950 px-5 py-5 text-white sm:px-6">
        <div className="pointer-events-none absolute -right-8 -top-12 h-40 w-40 rounded-full border-[24px] border-white/[0.04]" />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-3.5">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-white/10 bg-white/10 text-sky-200 shadow-inner">
              <Building2 className="h-5 w-5" strokeWidth={1.8} />
            </div>
            <div className="min-w-0 pt-0.5">
              <p className="mb-1 text-[9px] font-bold uppercase tracking-[0.2em] text-sky-300/80">
                Proveedor
              </p>
              <h3 className="break-words text-lg font-semibold leading-tight tracking-tight sm:text-xl">
                {grupo.empresa}
              </h3>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {grupo.provincias.map((provincia) => (
                  <span
                    key={provincia}
                    className="rounded-full border border-white/10 bg-white/[0.07] px-2.5 py-1 text-[10px] font-medium text-slate-200"
                  >
                    {provincia}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2 self-start rounded-xl border border-white/10 bg-white/[0.08] px-3.5 py-2.5 transition-colors group-hover:bg-white/[0.12]">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-sky-400/15 text-sky-200">
              <Phone className="h-4 w-4" />
            </span>
            <span>
              <span className="block text-[9px] font-medium uppercase tracking-wider text-slate-300">Teléfono base</span>
              {grupo.telefonoBase ? (
                <button
                  type="button"
                  onClick={() => {
                    if (grupo.telefonoBase) void copiarTelefono(grupo.telefonoBase);
                  }}
                  className="mt-0.5 block text-left text-sm font-semibold tabular-nums text-white hover:text-sky-200"
                  title="Copiar teléfono"
                  aria-label={`Copiar teléfono base ${grupo.telefonoBase}`}
                >
                  {grupo.telefonoBase}
                  {copiedPhone === grupo.telefonoBase && (
                    <span className="ml-1.5 text-[10px] font-medium text-emerald-300" role="status">
                      Copiado
                    </span>
                  )}
                  {copyError === grupo.telefonoBase && (
                    <span className="ml-1.5 text-[10px] font-medium text-red-300" role="status">
                      No se pudo copiar
                    </span>
                  )}
                </button>
              ) : (
                <span className="mt-0.5 block text-sm text-slate-300">No indicado</span>
              )}
            </span>
          </div>
        </div>

        <div className="relative mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-white/10 pt-3 text-xs text-slate-300">
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="h-3.5 w-3.5 text-sky-300" />
            <span className="font-medium text-slate-100">Zona</span>
            {grupo.zonas.join(' / ') || 'No especificada'}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <UserRound className="h-3.5 w-3.5 text-sky-300" />
            <span className="font-medium text-slate-100">Encargado</span>
            {grupo.encargado ?? 'No especificado'}
          </span>
        </div>
      </header>

      {grupo.detalles.length > 0 && (
        <div className="flex flex-wrap gap-1.5 border-b border-slate-100 bg-sky-50/60 px-5 py-3 sm:px-6">
          {grupo.detalles.map((detalle) => (
            <span
              key={detalle}
              className="rounded-full border border-sky-100 bg-white px-2.5 py-1 text-[10px] font-semibold text-sky-900 shadow-sm"
            >
              {detalle}
            </span>
          ))}
        </div>
      )}

      <section className="px-4 py-4 sm:px-6 sm:py-5">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h4 className="text-xs font-bold text-slate-800">Equipo de contacto</h4>
            <p className="mt-0.5 text-[10px] text-slate-400">Personas y líneas directas</p>
          </div>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-semibold tabular-nums text-slate-600">
            {grupo.contactos.length} {grupo.contactos.length === 1 ? 'contacto' : 'contactos'}
          </span>
        </div>

        <ul className="grid gap-2 sm:grid-cols-2">
          {grupo.contactos.map((contacto) => (
            <li
              key={contacto.id}
              className={`contact-row group/row flex min-w-0 items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/70 px-3 py-2.5 transition duration-200 hover:border-sky-200 hover:bg-white hover:shadow-md hover:shadow-slate-200/50 ${deletingId === contacto.id ? 'opacity-50' : ''}`}
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-slate-200 to-slate-100 text-[11px] font-bold text-slate-600 transition-colors group-hover/row:from-sky-100 group-hover/row:to-cyan-50 group-hover/row:text-sky-700">
                {contacto.nombre
                  .split(/\s+/)
                  .slice(0, 2)
                  .map((parte) => parte[0])
                  .join('')
                  .toLocaleUpperCase('es')}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold text-slate-800">{contacto.nombre}</p>
                <div className="mt-1 flex flex-wrap items-center gap-1.5">
                  {contacto.telefono ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (contacto.telefono) void copiarTelefono(contacto.telefono);
                      }}
                      className="inline-flex items-center gap-1 rounded-md bg-white px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-slate-600 ring-1 ring-slate-200 transition-colors hover:text-sky-700"
                      title="Copiar teléfono"
                      aria-label={`Copiar teléfono de ${contacto.nombre}: ${contacto.telefono}`}
                    >
                      <Phone className="h-2.5 w-2.5" />
                      {contacto.telefono}
                      {copiedPhone === contacto.telefono && <Check className="h-2.5 w-2.5 text-emerald-600" aria-label="Copiado" />}
                      {copyError === contacto.telefono && (
                        <span className="text-[9px] text-red-600" role="status">No se pudo copiar</span>
                      )}
                    </button>
                  ) : (
                    <span className="text-[10px] text-slate-400">Sin teléfono</span>
                  )}
                  {contacto.rol.map((rol) => (
                    <span key={rol} className="text-[9px] font-medium capitalize text-slate-400">
                      {rol}
                    </span>
                  ))}
                </div>
              </div>
              <button
                onClick={() => onDelete(contacto.id)}
                className="shrink-0 rounded-lg p-1.5 text-slate-300 opacity-60 transition hover:bg-red-50 hover:text-red-500 hover:opacity-100 sm:opacity-0 sm:group-hover/row:opacity-100"
                title={`Eliminar contacto ${contacto.nombre}`}
                aria-label={`Eliminar contacto ${contacto.nombre}`}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      </section>
    </article>
  );
}

function EmptyState({ provincia, hasData }: { provincia: string | null; hasData: boolean }) {
  return (
    <div className="grid place-items-center rounded-2xl border-2 border-dashed border-slate-200 bg-white/50 px-6 py-20 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-2xl bg-slate-100 text-slate-400">
        <MapPin className="h-7 w-7" />
      </div>
      <p className="mt-4 text-sm font-medium text-slate-700">
        {!hasData
          ? 'Aún no hay contactos registrados'
          : provincia
          ? `Sin proveedores en ${provincia}`
          : 'Selecciona una provincia'}
      </p>
      <p className="mt-1 text-xs text-slate-400">
        Usa el botón "Agregar contacto" para empezar a llenar el directorio.
      </p>
    </div>
  );
}

export default function App() {
  const [proveedores, setProveedores] = useState<Proveedor[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filtro, setFiltro] = useState<Filtro>('operador');
  const [busqueda, setBusqueda] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Cargar proveedores desde Supabase
  const cargar = useCallback(async () => {
    const { data, error } = await supabase
      .from('proveedores')
      .select('*')
      .order('created_at', { ascending: true });
    if (error) {
      console.error('No se pudieron cargar los contactos de Supabase:', error);
      setLoadError('No se pudieron cargar los contactos. Se conservaron los datos visibles; vuelve a intentar.');
      setLoading(false);
      return;
    }

    setLoadError(null);
    setProveedores((data as ProveedorRow[]).map(rowToProveedor));
    setLoading(false);
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel('proveedores-realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'proveedores' },
        () => {
          void cargar();
        },
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          void cargar();
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.error(`Supabase Realtime no pudo conectarse: ${status}`);
          setLoadError('No se pudo conectar a las actualizaciones en tiempo real.');
          setLoading(false);
        }
      });

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [cargar]);

  const provincias = useMemo(() => provinciasConProveedores(proveedores), [proveedores]);
  const todasConConteo = useMemo(() => {
    const map = new Map<string, number>();
    proveedores.forEach((p) => p.provincias.forEach((pr) => map.set(pr, (map.get(pr) ?? 0) + 1)));
    return map;
  }, [proveedores]);

  // Provincia activa: por defecto la primera con proveedores; si no hay, mostrar todas.
  const [provinciaActiva, setProvinciaActiva] = useState<string | null>(null);
  useEffect(() => {
    if (provinciaActiva === null && provincias.length > 0) {
      setProvinciaActiva(provincias[0]);
    }
    if (provinciaActiva && !provincias.includes(provinciaActiva)) {
      setProvinciaActiva(provincias[0] ?? null);
    }
  }, [provincias, provinciaActiva]);

  const conteosRol = useMemo(() => {
    if (!provinciaActiva) return { operador: 0, inspector: 0, hogar: 0, total: 0 };
    const enProv = proveedores.filter((p) => p.provincias.includes(provinciaActiva));
    return {
      operador: enProv.filter((p) => p.rol.includes('operador')).length,
      inspector: enProv.filter((p) => p.rol.includes('inspector')).length,
      hogar: enProv.filter((p) => p.rol.includes('hogar')).length,
      total: enProv.length,
    };
  }, [provinciaActiva, proveedores]);

  const empresasFiltradas = useMemo(() => {
    const contactosEnProvincia = provinciaActiva
      ? proveedores.filter((p) => p.provincias.includes(provinciaActiva))
      : proveedores;
    const grupos = crearGruposEmpresa(contactosEnProvincia);
    const termino = busqueda.trim().toLocaleLowerCase('es');

    return grupos.flatMap((grupo) => {
      const contactosConRol = grupo.contactos.filter((contacto) => contacto.rol.includes(filtro));
      if (contactosConRol.length === 0) return [];
      if (!termino) return [{ ...grupo, contactos: contactosConRol }];

      const encabezadoCoincide = [
        grupo.empresa,
        grupo.telefonoBase ?? '',
        grupo.encargado ?? '',
        ...grupo.zonas,
        ...grupo.provincias,
      ].some((valor) => valor.toLocaleLowerCase('es').includes(termino));

      const contactosVisibles = encabezadoCoincide
        ? contactosConRol
        : contactosConRol.filter((contacto) =>
            [contacto.nombre, contacto.telefono ?? '', contacto.correo ?? '', contacto.notas ?? '']
              .some((valor) => valor.toLocaleLowerCase('es').includes(termino)),
          );

      return contactosVisibles.length > 0 ? [{ ...grupo, contactos: contactosVisibles }] : [];
    });
  }, [proveedores, provinciaActiva, filtro, busqueda]);

  const handlePickProvincia = (pr: string) => {
    setProvinciaActiva(pr);
    setSidebarOpen(false);
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    const { error } = await supabase.from('proveedores').delete().eq('id', id);
    setDeletingId(null);
    if (error) {
      setLoadError('No se pudo eliminar el contacto.');
      return;
    }
    await cargar();
  };

  // Lista a mostrar en el sidebar: si hay proveedores, solo las que tienen; si no, todas.
  const provinciasSidebar = provincias.length > 0 ? provincias : NOMBRES_PROVINCIAS;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-slate-900/50 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col bg-slate-900 transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="border-b border-slate-800">
          <Logo />
        </div>

        <div className="flex items-center justify-between px-5 pt-5 pb-2">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Provincias
          </h2>
          <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] font-semibold text-slate-400">
            {provincias.length}
          </span>
        </div>

        <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 pb-4">
          {provinciasSidebar.map((pr) => (
            <ProvinciaItem
              key={pr}
              provincia={pr}
              count={todasConConteo.get(pr) ?? 0}
              active={provinciaActiva === pr}
              onClick={() => handlePickProvincia(pr)}
            />
          ))}
        </nav>

        <div className="border-t border-slate-800 px-5 py-4 text-[10px] leading-relaxed text-slate-500">
          <p className="font-semibold text-slate-400">INTELASIST · Proveedores</p>
          <p className="mt-1 font-semibold uppercase tracking-wide text-slate-400">Gerente de proveedores</p>
          <p className="text-slate-200">Jorge Samudio</p>
          <p className="mt-0.5">Directorio de recursos por provincia</p>
        </div>
      </aside>

      {/* Contenido principal */}
      <div className="lg:pl-72">
        {/* Topbar móvil */}
        <div className="sticky top-0 z-20 flex items-center justify-between border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur lg:hidden">
          <button
            onClick={() => setSidebarOpen(true)}
            className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700"
          >
            <MapPin className="h-4 w-4 text-sky-600" />
            Provincias
          </button>
          <div className="flex items-center gap-2">
            <Cpu className="h-5 w-5 text-sky-600" />
            <span className="text-sm font-bold tracking-tight">INTELASIST</span>
          </div>
        </div>

        {/* Header */}
        <header className="border-b border-slate-200 bg-white px-6 pt-6 pb-5 lg:px-10">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
              <span>Directorio</span>
              <ChevronRight className="h-3.5 w-3.5" />
              <span>Provincias</span>
              {provinciaActiva && (
                <>
                  <ChevronRight className="h-3.5 w-3.5" />
                  <span className="font-semibold text-sky-700">{provinciaActiva}</span>
                </>
              )}
            </div>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              {provinciaActiva ?? 'Selecciona una provincia'}
            </h1>
            {provinciaActiva && (
              <p className="text-sm text-slate-500">
                Capital: {CAPITAL_PROVINCIA[provinciaActiva]} ·{' '}
                {conteosRol.total} contacto{conteosRol.total === 1 ? '' : 's'}
              </p>
            )}
          </div>

          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-wrap gap-2">
              {FILTROS.map((f) => {
                const Icon = f.icon;
                const active = filtro === f.id;
                const count = conteosRol[f.id];
                return (
                  <button
                    key={f.id}
                    onClick={() => setFiltro(f.id)}
                    className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-all ${
                      active
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {f.label}
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums ${
                        active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="flex w-full items-center gap-2 sm:w-auto">
              <div className="relative w-full sm:w-64">
                <input
                  type="text"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar por nombre o empresa..."
                  className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-9 text-sm text-slate-700 placeholder:text-slate-400 focus:border-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-100"
                />
                <svg
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                >
                  <circle cx="11" cy="11" r="7" />
                  <path d="m21 21-4.3-4.3" />
                </svg>
                {busqueda && (
                  <button
                    onClick={() => setBusqueda('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
              <button
                onClick={() => setModalOpen(true)}
                className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-sky-600 px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-sky-700"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Agregar contacto</span>
                <span className="sm:hidden">Agregar</span>
              </button>
            </div>
          </div>

          {loadError && (
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 ring-1 ring-red-200">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {loadError}
            </div>
          )}
        </header>

        {/* Contenido */}
        <main className="px-6 py-6 lg:px-10 lg:py-8">
          {loading ? (
            <div className="grid place-items-center py-20 text-slate-400">
              <Loader2 className="h-7 w-7 animate-spin text-sky-500" />
              <p className="mt-3 text-sm">Cargando contactos...</p>
            </div>
          ) : empresasFiltradas.length === 0 ? (
            <EmptyState provincia={provinciaActiva} hasData={proveedores.length > 0} />
          ) : (
            <div className="space-y-5">
              {empresasFiltradas.map((grupo) => (
                <EmpresaCard
                  key={grupo.id}
                  grupo={grupo}
                  deletingId={deletingId}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </main>
      </div>

      <AddProveedorModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={cargar}
      />
    </div>
  );
}
