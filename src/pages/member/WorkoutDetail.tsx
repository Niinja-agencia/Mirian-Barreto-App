import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router';
import { ArrowLeft, Lock, Check, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { useSubscription } from '@/hooks/useSubscription';
import { formatDuration, LEVEL_LABELS } from '@/lib/format';
import type { Workout } from '@/lib/database.types';
import ProtectedVideo from '@/components/ProtectedVideo';
import FullScreenLoader from '@/components/FullScreenLoader';

export default function WorkoutDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const { currentLang } = useLanguage();
  const { tier } = useSubscription();
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [loading, setLoading] = useState(true);
  const [completed, setCompleted] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    (async () => {
      setLoading(true);
      const [{ data: w }, { data: prog }] = await Promise.all([
        supabase.from('workouts').select('*').eq('id', id).maybeSingle(),
        user
          ? supabase
              .from('workout_progress')
              .select('id')
              .eq('user_id', user.id)
              .eq('workout_id', id)
              .maybeSingle()
          : Promise.resolve({ data: null }),
      ]);
      setWorkout(w ?? null);
      setCompleted(!!prog);
      setLoading(false);
    })();
  }, [id, user]);

  async function toggleComplete() {
    if (!user || !workout) return;
    setSaving(true);
    if (completed) {
      await supabase
        .from('workout_progress')
        .delete()
        .eq('user_id', user.id)
        .eq('workout_id', workout.id);
      setCompleted(false);
    } else {
      await supabase
        .from('workout_progress')
        .upsert({ user_id: user.id, workout_id: workout.id }, { onConflict: 'user_id,workout_id' });
      setCompleted(true);
      toast.success('Treino marcado como concluído! 💪');
    }
    setSaving(false);
  }

  if (loading) return <FullScreenLoader />;
  if (!workout) {
    return (
      <div className="space-y-4">
        <p className="text-[var(--color-medium-grey)]">Treino não encontrado.</p>
        <Link to="/app/treinos" className="text-[var(--color-rose)] hover:underline">
          Voltar aos treinos
        </Link>
      </div>
    );
  }

  const title = currentLang === 'pt' ? workout.title_pt : workout.title_en;
  const desc = currentLang === 'pt' ? workout.description_pt : workout.description_en;
  const locked = workout.required_tier > tier;

  return (
    <div className="space-y-6">
      <Link
        to="/app/treinos"
        className="inline-flex items-center gap-2 text-sm text-[var(--color-medium-grey)] hover:text-[var(--color-rose)]"
      >
        <ArrowLeft size={16} /> Voltar aos treinos
      </Link>

      {locked ? (
        <div className="flex aspect-video w-full flex-col items-center justify-center gap-4 rounded-2xl bg-[var(--color-black)] p-6 text-center text-white">
          <Lock className="text-[var(--color-rose)]" size={36} />
          <div>
            <p className="text-lg font-semibold">Conteúdo bloqueado</p>
            <p className="mt-1 max-w-sm text-sm text-[rgba(255,255,255,0.7)]">
              Este treino faz parte de um plano superior ao seu. Faça upgrade para liberar.
            </p>
          </div>
          <Link
            to="/app/assinatura"
            className="rounded-lg bg-[var(--color-rose)] px-5 py-2.5 text-sm font-semibold uppercase tracking-[0.06em] text-white hover:bg-[var(--color-rose-hover)]"
          >
            Fazer upgrade
          </Link>
        </div>
      ) : (
        <ProtectedVideo workoutId={workout.id} />
      )}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1
            className="text-[var(--color-black)] font-semibold"
            style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.5rem, 3.5vw, 2.2rem)' }}
          >
            {title}
          </h1>
          <div className="mt-2 flex items-center gap-4 text-sm text-[var(--color-medium-grey)]">
            <span>{LEVEL_LABELS[workout.level]}</span>
            <span className="flex items-center gap-1">
              <Clock size={14} /> {formatDuration(workout.duration_seconds)}
            </span>
          </div>
        </div>

        {!locked && (
          <button
            onClick={toggleComplete}
            disabled={saving}
            className={`flex shrink-0 items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold uppercase tracking-[0.06em] transition-colors disabled:opacity-60 ${
              completed
                ? 'bg-[var(--color-warm-grey)] text-[var(--color-black)]'
                : 'bg-[var(--color-rose)] text-white hover:bg-[var(--color-rose-hover)]'
            }`}
          >
            <Check size={16} />
            {completed ? 'Concluído' : 'Marcar como concluído'}
          </button>
        )}
      </div>

      {desc && <p className="max-w-2xl leading-relaxed text-[var(--color-black)]">{desc}</p>}
    </div>
  );
}
