import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Dumbbell, TrendingUp, Lock, ArrowRight } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useSubscription } from '@/hooks/useSubscription';
import { subscriptionStatusLabel } from '@/lib/format';

export default function Dashboard() {
  const { user } = useAuth();
  const { subscription, tier, loading } = useSubscription();
  const [stats, setStats] = useState({ available: 0, completed: 0 });

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ count: available }, { count: completed }] = await Promise.all([
        supabase.from('workouts').select('*', { count: 'exact', head: true }).eq('published', true),
        supabase
          .from('workout_progress')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id),
      ]);
      setStats({ available: available ?? 0, completed: completed ?? 0 });
    })();
  }, [user]);

  const hasAccess = tier > 0;

  return (
    <div className="space-y-8">
      <div>
        <h1
          className="text-[var(--color-black)] font-semibold"
          style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.8rem, 4vw, 2.6rem)' }}
        >
          Seu painel
        </h1>
        <p className="mt-1 text-[var(--color-medium-grey)]">
          {hasAccess
            ? 'Tudo pronto para treinar. Bora?'
            : 'Ative um plano para liberar os treinos.'}
        </p>
      </div>

      {/* Aviso de acesso */}
      {!loading && !hasAccess && (
        <div className="flex flex-col gap-3 rounded-2xl bg-[var(--color-black)] p-6 text-white sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Lock size={22} className="text-[var(--color-rose)]" />
            <div>
              <p className="font-semibold">Você ainda não tem um plano ativo</p>
              <p className="text-sm text-[rgba(255,255,255,0.7)]">
                {subscription
                  ? `Status atual: ${subscriptionStatusLabel(subscription.status)}`
                  : 'Escolha um plano para começar.'}
              </p>
            </div>
          </div>
          <Link
            to="/app/assinatura"
            className="rounded-lg bg-[var(--color-rose)] px-5 py-2.5 text-center text-sm font-semibold uppercase tracking-[0.06em] text-white hover:bg-[var(--color-rose-hover)]"
          >
            Ver planos
          </Link>
        </div>
      )}

      {/* Cards de estatística */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard icon={Dumbbell} label="Treinos disponíveis" value={stats.available} />
        <StatCard icon={TrendingUp} label="Treinos concluídos" value={stats.completed} />
      </div>

      {/* CTA treinos */}
      <Link
        to="/app/treinos"
        className="group flex items-center justify-between rounded-2xl bg-white p-6 transition-shadow hover:shadow-lg"
        style={{ border: '1px solid var(--color-divider-dark)' }}
      >
        <div>
          <p className="font-semibold text-[var(--color-black)]">Explorar treinos</p>
          <p className="text-sm text-[var(--color-medium-grey)]">
            Veja todas as videoaulas por categoria e nível.
          </p>
        </div>
        <ArrowRight className="text-[var(--color-rose)] transition-transform group-hover:translate-x-1" />
      </Link>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Dumbbell;
  label: string;
  value: number;
}) {
  return (
    <div
      className="rounded-2xl bg-white p-6"
      style={{ border: '1px solid var(--color-divider-dark)' }}
    >
      <Icon className="text-[var(--color-rose)]" size={24} />
      <p className="mt-4 text-3xl font-bold text-[var(--color-black)]">{value}</p>
      <p className="text-sm text-[var(--color-medium-grey)]">{label}</p>
    </div>
  );
}
