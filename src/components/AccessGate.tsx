import { useState } from 'react';
import { Cpu, KeyRound, Loader2 } from 'lucide-react';
import { apiRequest, type AccessSession } from '@/lib/api';

interface Props {
  onAuthenticated: (session: AccessSession) => void;
}

export function AccessGate({ onAuthenticated }: Props) {
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const session = await apiRequest<AccessSession>('/session', {
        method: 'POST',
        body: { code },
      });
      onAuthenticated(session);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No se pudo iniciar sesión.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="grid min-h-screen place-items-center bg-gradient-to-br from-slate-950 via-slate-900 to-sky-950 px-4 py-10">
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-2xl border border-white/10 bg-white p-7 shadow-2xl shadow-slate-950/40"
      >
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-sky-500 to-cyan-600 text-white shadow-lg shadow-sky-500/30">
          <Cpu className="h-7 w-7" />
        </div>
        <p className="mt-5 text-center text-[10px] font-bold uppercase tracking-[0.22em] text-sky-700">
          INTELASIST
        </p>
        <h1 className="mt-1 text-center text-xl font-bold tracking-tight text-slate-900">
          INTELASIST PROVEEDORES
        </h1>
        <p className="mt-2 text-center text-sm text-slate-500">
          Escribe tu código para acceder al directorio.
        </p>

        <label className="mt-6 block">
          <span className="mb-1.5 block text-xs font-semibold text-slate-600">Código de acceso</span>
          <span className="relative block">
            <KeyRound className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              autoComplete="current-password"
              autoFocus
              required
              type="password"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white py-2.5 pl-10 pr-3 text-sm text-slate-700 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
              placeholder="Ingresa tu código"
            />
          </span>
        </label>

        {error && (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting || !code}
          className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {submitting ? 'Validando...' : 'Ingresar'}
        </button>
      </form>
    </main>
  );
}
