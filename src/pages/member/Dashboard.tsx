import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Dumbbell, TrendingUp, Lock, ArrowRight, Megaphone, Pin, Clock, PlayCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { useSubscription } from '@/hooks/useSubscription';
import { subscriptionLabel, formatDuration, LEVEL_LABELS } from '@/lib/format';
import { thumbUrl } from '@/lib/storage';
import type { Announcement, Workout } from '@/lib/database.types';

export default function Dashboard() {
  const { user } = useAuth();
  const { currentLang } = useLanguage();
  const { subscription, tier, loading } = useSubscription();
  const [stats, setStats] = useState({ available: 0, completed: 0 });
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [recommended, setRecommended] = useState<Workout[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ count: available }, { count: completed }, { data: anns }, { data: recs }] =
        await Promise.all([
          supabase.from('workouts').select('*', { count: 'exact', head: true }).eq('published', true),
          supabase
            .from('workout_progress')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id),
          supabase
            .from('announcements')
            .select('*')
            .eq('published', true)
            .order('pinned', { ascending: false })
            .order('created_at', { ascending: false })
            .limit(4),
          supabase
            .from('workouts')
            .select('*')
            .eq('published', true)
            .order('sort_order')
            .limit(4),
        ]);
      setStats({ available: available ?? 0, completed: completed ?? 0 });
      setAnnouncements(anns ?? []);
      setRecommended(recs ?? []);
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
          {hasAccess ? 'Tudo pronto para treinar. Bora?' : 'Ative um plano para liberar os treinos.'}
        </p>
      </div>

      {!loading && !hasAccess && (
        <div className="flex flex-col gap-3 rounded-2xl bg-[var(--color-black)] p-6 text-white sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <Lock size={22} className="text-[var(--color-rose)]" />
            <div>
              <p className="font-semibold">Você ainda não tem um plano ativo</p>
              <p className="text-sm text-[rgba(255,255,255,0.7)]">
                {subscription
                  ? `Status atual: ${subscriptionLabel(subscription)}`
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

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard icon={Dumbbell} label="Treinos disponíveis" value={stats.available} />
        <StatCard icon={TrendingUp} label="Treinos concluídos" value={stats.completed} />
      </div>

      {/* Avisos da Mirian */}
      {announcements.length > 0 && (
        <section>
          <div className="mb-3 flex items-center gap-2">
            <Megaphone size={18} className="text-[var(--color-rose)]" />
            <h2 className="text-lg font-semibold text-[var(--color-black)]">Avisos da Mirian</h2>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {announcements.map((a) => (
              <div
                key={a.id}
                className="rounded-2xl bg-white p-5"
                style={{ border: '1px solid var(--color-divider-dark)' }}
              >
                <div className="flex items-start gap-2">
                  {a.pinned && <Pin size={15} className="mt-1 shrink-0 text-[var(--color-rose)]" />}
                  <div>
                    <p className="font-semibold text-[var(--color-black)]">
                      {currentLang === 'pt' ? a.title_pt : a.title_en}
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-[var(--color-medium-grey)]">
                      {currentLang === 'pt' ? a.body_pt : a.body_en}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Recomendados */}
      {recommended.length > 0 && (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[var(--color-black)]">Recomendados para você</h2>
            <Link to="/app/treinos" className="text-sm font-medium text-[var(--color-rose)] hover:underline">
              Ver todos
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {recommended.map((w) => {
              const locked = w.required_tier > tier;
              const title = currentLang === 'pt' ? w.title_pt : w.title_en;
              const thumb = thumbUrl(w.thumbnail_path);
              return (
                <Link
                  key={w.id}
                  to={`/app/treinos/${w.id}`}
                  className="group overflow-hidden rounded-2xl bg-white transition-shadow hover:shadow-lg"
                  style={{ border: '1px solid var(--color-divider-dark)' }}
                >
                  <div className="relative aspect-video bg-[var(--color-black)]">
                    {thumb ? (
                      <img src={thumb} alt={title} className="h-full w-full object-cover" loading="lazy" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-[var(--color-medium-grey)]">
                        <PlayCircle size={32} />
                      </div>
                    )}
                    {locked && (
                      <span className="absolute right-2 top-2 rounded bg-black/80 px-2 py-1 text-xs font-medium text-white">
                        <Lock size={11} className="inline" />
                      </span>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="truncate text-sm font-semibold text-[var(--color-black)]">{title}</p>
                    <div className="mt-1 flex items-center gap-2 text-xs text-[var(--color-medium-grey)]">
                      <span>{LEVEL_LABELS[w.level]}</span>
                      <span className="flex items-center gap-1">
                        <Clock size={11} /> {formatDuration(w.duration_seconds)}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

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
    <div className="rounded-2xl bg-white p-6" style={{ border: '1px solid var(--color-divider-dark)' }}>
      <Icon className="text-[var(--color-rose)]" size={24} />
      <p className="mt-4 text-3xl font-bold text-[var(--color-black)]">{value}</p>
      <p className="text-sm text-[var(--color-medium-grey)]">{label}</p>
    </div>
  );
}
