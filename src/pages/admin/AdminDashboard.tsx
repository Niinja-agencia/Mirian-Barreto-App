import { useEffect, useState } from 'react';
import { Users, CreditCard, DollarSign, Dumbbell } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { brl, formatDate, paymentMethodLabel, paymentStatusLabel } from '@/lib/format';
import type { Plan, Subscription, Payment } from '@/lib/database.types';
import FullScreenLoader from '@/components/FullScreenLoader';

interface Metrics {
  students: number;
  activeSubs: number;
  mrr: number;
  revenue30: number;
  workouts: number;
}

export default function AdminDashboard() {
  const [m, setM] = useState<Metrics | null>(null);
  const [recent, setRecent] = useState<(Payment & { profile?: { full_name: string | null } | null })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const now = new Date();
      const ago30 = new Date(now.getTime() - 30 * 24 * 3600 * 1000).toISOString();

      const [{ count: students }, subsRes, { count: workouts }, payRes, recentRes] =
        await Promise.all([
          supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'aluno'),
          supabase
            .from('subscriptions')
            .select('*, plan:plans(*)')
            .in('status', ['active', 'trialing']),
          supabase.from('workouts').select('*', { count: 'exact', head: true }),
          supabase.from('payments').select('amount').eq('status', 'approved').gte('paid_at', ago30),
          supabase
            .from('payments')
            .select('*, profile:profiles(full_name)')
            .order('created_at', { ascending: false })
            .limit(8),
        ]);

      const subs = (subsRes.data as unknown as (Subscription & { plan: Plan | null })[]) ?? [];
      const validSubs = subs.filter(
        (s) => !s.current_period_end || new Date(s.current_period_end) > now
      );
      const mrr = validSubs.reduce((sum, s) => {
        if (!s.plan) return sum;
        const monthly =
          s.billing === 'annual' ? Number(s.plan.price_annual) / 12 : Number(s.plan.price_monthly);
        return sum + monthly;
      }, 0);
      const revenue30 = ((payRes.data as { amount: number }[]) ?? []).reduce(
        (sum, p) => sum + Number(p.amount),
        0
      );

      setM({
        students: students ?? 0,
        activeSubs: validSubs.length,
        mrr,
        revenue30,
        workouts: workouts ?? 0,
      });
      setRecent((recentRes.data as unknown as typeof recent) ?? []);
      setLoading(false);
    })();
  }, []);

  if (loading || !m) return <FullScreenLoader />;

  return (
    <div className="space-y-8">
      <h1
        className="text-[var(--color-black)] font-semibold"
        style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.8rem, 4vw, 2.6rem)' }}
      >
        Visão geral
      </h1>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric icon={Users} label="Alunas" value={String(m.students)} />
        <Metric icon={CreditCard} label="Assinaturas ativas" value={String(m.activeSubs)} />
        <Metric icon={DollarSign} label="MRR (receita recorrente)" value={brl(m.mrr)} />
        <Metric icon={DollarSign} label="Receita (30 dias)" value={brl(m.revenue30)} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric icon={Dumbbell} label="Treinos cadastrados" value={String(m.workouts)} />
      </div>

      {/* Pagamentos recentes */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-[var(--color-black)]">Pagamentos recentes</h2>
        <div
          className="overflow-x-auto rounded-2xl bg-white"
          style={{ border: '1px solid var(--color-divider-dark)' }}
        >
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--color-divider-dark)] text-left text-[var(--color-medium-grey)]">
                <th className="px-4 py-3 font-medium">Aluna</th>
                <th className="px-4 py-3 font-medium">Valor</th>
                <th className="px-4 py-3 font-medium">Método</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Data</th>
              </tr>
            </thead>
            <tbody>
              {recent.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-[var(--color-medium-grey)]">
                    Nenhum pagamento ainda.
                  </td>
                </tr>
              ) : (
                recent.map((p) => (
                  <tr key={p.id} className="border-b border-[var(--color-divider-dark)] last:border-0">
                    <td className="px-4 py-3 text-[var(--color-black)]">
                      {p.profile?.full_name ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-[var(--color-black)]">{brl(Number(p.amount))}</td>
                    <td className="px-4 py-3 text-[var(--color-medium-grey)]">
                      {paymentMethodLabel(p.method)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={p.status} />
                    </td>
                    <td className="px-4 py-3 text-[var(--color-medium-grey)]">
                      {formatDate(p.created_at)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-white p-5" style={{ border: '1px solid var(--color-divider-dark)' }}>
      <Icon className="text-[var(--color-rose)]" size={22} />
      <p className="mt-3 text-2xl font-bold text-[var(--color-black)]">{value}</p>
      <p className="text-sm text-[var(--color-medium-grey)]">{label}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const ok = status === 'approved';
  return (
    <span
      className={`rounded px-2 py-1 text-xs font-medium ${
        ok ? 'bg-green-100 text-green-700' : 'bg-[var(--color-warm-grey)] text-[var(--color-medium-grey)]'
      }`}
    >
      {paymentStatusLabel(status)}
    </span>
  );
}
