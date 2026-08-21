import { useEffect, useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import Avatar from '@/components/Avatar';
import { supabase } from '@/lib/supabase';
import { formatDate, subscriptionIsCurrent, subscriptionLabel, LEVEL_LABELS } from '@/lib/format';
import type { Profile, Subscription, Plan } from '@/lib/database.types';
import FullScreenLoader from '@/components/FullScreenLoader';

interface StudentRow extends Profile {
  subscriptions: (Subscription & { plan: Pick<Plan, 'name_pt' | 'tier'> | null })[];
}

export default function AdminStudents() {
  const [rows, setRows] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState('');

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from('profiles')
        .select('*, subscriptions(*, plan:plans(name_pt, tier))')
        .order('created_at', { ascending: false });
      setRows((data as unknown as StudentRow[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return rows;
    return rows.filter((r) => (r.full_name ?? '').toLowerCase().includes(term));
  }, [rows, q]);

  if (loading) return <FullScreenLoader />;

  // A assinatura que vale é a VIGENTE de maior tier — não simplesmente a mais
  // recente. Cada clique em "Pagar" cria uma linha 'pending'; pela regra antiga
  // uma aluna ativa que abrisse o checkout e desistisse aparecia como pendente.
  // Sem nenhuma vigente, mostra a mais recente (para exibir vencida/cancelada).
  function currentSub(r: StudentRow) {
    const subs = [...(r.subscriptions ?? [])].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
    const vigentes = subs.filter(subscriptionIsCurrent);
    const melhor = vigentes.reduce<(typeof subs)[number] | null>(
      (best, s) => (!best || (s.plan?.tier ?? 0) > (best.plan?.tier ?? 0) ? s : best),
      null
    );
    return melhor ?? subs[0] ?? null;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-[var(--color-black)]">Alunas</h1>

      <div className="relative max-w-sm">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-medium-grey)]" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nome…"
          className="w-full rounded-lg border border-[var(--color-divider-dark)] bg-white py-2.5 pl-9 pr-3 text-sm"
        />
      </div>

      <div className="overflow-x-auto rounded-2xl bg-white" style={{ border: '1px solid var(--color-divider-dark)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--color-divider-dark)] text-left text-[var(--color-medium-grey)]">
              <th className="px-4 py-3 font-medium">Nome</th>
              <th className="px-4 py-3 font-medium">Nível</th>
              <th className="px-4 py-3 font-medium">Plano</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Desde</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => {
              const sub = currentSub(r);
              // Vigente = status ativo E período ainda válido (mesma regra do banco).
              const isActive = subscriptionIsCurrent(sub);
              return (
                <tr key={r.id} className="border-b border-[var(--color-divider-dark)] last:border-0">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar url={r.avatar_url} name={r.full_name} size={36} />
                      <div>
                        <p className="text-[var(--color-black)]">{r.full_name ?? '—'}</p>
                        {r.role === 'admin' && (
                          <span className="text-xs font-medium text-[var(--color-rose)]">admin</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[var(--color-medium-grey)]">{LEVEL_LABELS[r.level]}</td>
                  <td className="px-4 py-3 text-[var(--color-medium-grey)]">{sub?.plan?.name_pt ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded px-2 py-1 text-xs font-medium ${
                        isActive ? 'bg-green-100 text-green-700' : 'bg-[var(--color-warm-grey)] text-[var(--color-medium-grey)]'
                      }`}
                    >
                      {subscriptionLabel(sub)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-[var(--color-medium-grey)]">{formatDate(r.created_at)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
