import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { formatDate } from '@/lib/format';
import type { Workout } from '@/lib/database.types';
import FullScreenLoader from '@/components/FullScreenLoader';

interface ProgressRow {
  workout_id: string;
  completed_at: string;
  workout: Pick<Workout, 'title_pt' | 'title_en'> | null;
}

export default function Progress() {
  const { user } = useAuth();
  const { currentLang } = useLanguage();
  const [rows, setRows] = useState<ProgressRow[]>([]);
  const [available, setAvailable] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data }, { count }] = await Promise.all([
        supabase
          .from('workout_progress')
          .select('workout_id, completed_at, workout:workouts(title_pt, title_en)')
          .eq('user_id', user.id)
          .order('completed_at', { ascending: false }),
        supabase.from('workouts').select('*', { count: 'exact', head: true }).eq('published', true),
      ]);
      setRows((data as unknown as ProgressRow[]) ?? []);
      setAvailable(count ?? 0);
      setLoading(false);
    })();
  }, [user]);

  if (loading) return <FullScreenLoader />;

  const done = rows.length;
  const pct = available > 0 ? Math.round((done / available) * 100) : 0;

  return (
    <div className="space-y-6">
      <h1
        className="text-[var(--color-black)] font-semibold"
        style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.8rem, 4vw, 2.6rem)' }}
      >
        Meu progresso
      </h1>

      <div className="rounded-2xl bg-white p-6" style={{ border: '1px solid var(--color-divider-dark)' }}>
        <div className="flex items-end justify-between">
          <div>
            <p className="text-3xl font-bold text-[var(--color-black)]">{done}</p>
            <p className="text-sm text-[var(--color-medium-grey)]">de {available} treinos concluídos</p>
          </div>
          <p className="text-2xl font-bold text-[var(--color-rose)]">{pct}%</p>
        </div>
        <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-[var(--color-warm-grey)]">
          <div
            className="h-full rounded-full bg-[var(--color-rose)] transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>

      {done === 0 ? (
        <div className="rounded-2xl bg-white p-8 text-center" style={{ border: '1px solid var(--color-divider-dark)' }}>
          <p className="text-[var(--color-medium-grey)]">
            Você ainda não concluiu nenhum treino.
          </p>
          <Link
            to="/app/treinos"
            className="mt-3 inline-block text-[var(--color-rose)] font-medium hover:underline"
          >
            Começar agora
          </Link>
        </div>
      ) : (
        <ul className="divide-y divide-[var(--color-divider-dark)] overflow-hidden rounded-2xl bg-white" style={{ border: '1px solid var(--color-divider-dark)' }}>
          {rows.map((r) => (
            <li key={r.workout_id}>
              <Link
                to={`/app/treinos/${r.workout_id}`}
                className="flex items-center justify-between px-5 py-4 hover:bg-[var(--color-warm-grey)]"
              >
                <span className="flex items-center gap-3 text-[var(--color-black)]">
                  <CheckCircle2 className="text-[var(--color-rose)]" size={18} />
                  {r.workout ? (currentLang === 'pt' ? r.workout.title_pt : r.workout.title_en) : 'Treino'}
                </span>
                <span className="text-sm text-[var(--color-medium-grey)]">
                  {formatDate(r.completed_at)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
