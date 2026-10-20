import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Cpu, MapPin, Wrench, SearchCheck, Home,
  ChevronRight, X, Plus, Loader2, Trash2, AlertCircle,
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

      const detalle = contacto.notas
        ?.replace(/Contacto de empresa:\s*[^|]+(?:\s*\|\s*)?/i, '')
        .replace(/^\s*\|\s*|\s*\|\s*$/g, '')
        .trim();
      if (detalle) detallesMap.set(detalle.toLocaleLowerCase('es'), detalle);
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
      <span className="flex flex-1 flex-col truncate">
        <span className="truncate font-medium leading-tight">{provincia}</span>
        <span className={`truncate text-[10px] font-normal leading-tight ${active ? 'text-sky-300/70' : 'text-slate-500 group-hover:text-slate-400'}`}>
          Capital: {CAPITAL_PROVINCIA[provincia]}
        </span>
      </span>
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
  return (
    <article className="overflow-hidden border border-slate-300 bg-white">
      <header className="grid gap-x-6 gap-y-1 border-b border-amber-300 bg-amber-100 px-4 py-2.5 text-xs font-bold text-slate-900 sm:grid-cols-[minmax(0,1.2fr)_minmax(100px,0.45fr)_minmax(0,2fr)]">
        <h3 className="min-w-0 break-words">{grupo.empresa}</h3>
        {grupo.telefonoBase ? (
          <a
            href={`tel:${grupo.telefonoBase.replace(/[^\d]/g, '')}`}
            className="whitespace-nowrap hover:text-sky-800"
          >
            {grupo.telefonoBase}
          </a>
        ) : (
          <span className="text-slate-500">Base sin teléfono</span>
        )}
        <p className="min-w-0 break-words font-semibold">
          Zona: {grupo.zonas.join(' / ') || 'No especificada'}
          <span className="px-1.5 text-amber-700">·</span>
          Contacto: {grupo.encargado ?? 'No especificado'}
        </p>
      </header>

      {grupo.detalles.length > 0 && (
        <div className="border-b border-slate-200 px-4 py-1.5 text-[10px] font-bold uppercase leading-relaxed tracking-wide text-blue-950">
          {grupo.detalles.join(' | ')}
        </div>
      )}

      {grupo.provincias.length > 1 && (
        <div className="border-b border-slate-100 px-4 py-1 text-[10px] text-slate-500">
          Provincias: {grupo.provincias.join(' / ')}
        </div>
      )}

      <ul className="px-4">
        {grupo.contactos.map((contacto) => (
          <li
            key={contacto.id}
            className={`grid grid-cols-[minmax(0,1fr)_minmax(90px,0.45fr)_28px] items-center gap-3 border-b border-dotted border-slate-300 py-2 text-xs last:border-b-0 ${deletingId === contacto.id ? 'opacity-50' : ''}`}
          >
            <div className="min-w-0">
              <p className="break-words font-medium text-slate-800">{contacto.nombre}</p>
              {contacto.correo && (
                <a
                  href={`mailto:${contacto.correo}`}
                  className="mt-0.5 block truncate text-[10px] text-slate-500 hover:text-sky-700"
                >
                  {contacto.correo}
                </a>
              )}
            </div>
            {contacto.telefono ? (
              <a
                href={`tel:${contacto.telefono.replace(/[^\d]/g, '')}`}
                className="whitespace-nowrap text-slate-700 hover:text-sky-700"
              >
                {contacto.telefono}
              </a>
            ) : (
              <span className="text-slate-400">—</span>
            )}
            <button
              onClick={() => onDelete(contacto.id)}
              className="rounded p-1 text-slate-300 transition-colors hover:bg-red-50 hover:text-red-500"
              title={`Eliminar contacto ${contacto.nombre}`}
              aria-label={`Eliminar contacto ${contacto.nombre}`}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </li>
        ))}
      </ul>
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
