import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { formatDate, LEVEL_LABELS } from '@/lib/format';
import { measurements, withSignedPhotos, type ProgressWithPhoto } from '@/lib/bodyProgress';
import type { BodyProgress, Profile, Workout } from '@/lib/database.types';
import FullScreenLoader from '@/components/FullScreenLoader';

interface CompletedWorkout {
  workout_id: string;
  completed_at: string;
  workout: Pick<Workout, 'title_pt'> | null;
}

export default function AdminStudentProgress() {
  const { id } = useParams();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [entries, setEntries] = useState<ProgressWithPhoto[]>([]);
  const [completed, setCompleted] = useState<CompletedWorkout[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let active = true;
    (async () => {
      const [profileRes, entriesRes, workoutsRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', id).maybeSingle(),
        supabase.from('body_progress').select('*').eq('user_id', id)
          .order('recorded_on', { ascending: false }).order('created_at', { ascending: false }),
        supabase.from('workout_progress')
          .select('workout_id, completed_at, workout:workouts(title_pt)')
          .eq('user_id', id).order('completed_at', { ascending: false }),
      ]);
      if (!active) return;
      if (profileRes.error || entriesRes.error || workoutsRes.error) {
        setError('Não foi possível carregar a evolução desta aluna.');
      }
      setProfile(profileRes.data);
      setCompleted((workoutsRes.data as unknown as CompletedWorkout[]) ?? []);
      setEntries(await withSignedPhotos((entriesRes.data as BodyProgress[]) ?? []));
      setLoading(false);
    })();
    return () => { active = false; };
  }, [id]);

  if (loading) return <FullScreenLoader />;
  if (error || !profile) return <p className="text-red-700">{error ?? 'Aluna não encontrada.'}</p>;

  const weights = entries.filter((entry) => entry.weight_kg != null);
  const firstWeight = weights[weights.length - 1];
  const latestWeight = weights[0];
  const latestMeasures = entries.find((entry) => measurements.some(({ key }) => entry[key] != null));
  const weightChange = firstWeight && latestWeight && firstWeight.id !== latestWeight.id
    ? Number(latestWeight.weight_kg) - Number(firstWeight.weight_kg) : null;

  return (
    <div className="space-y-8">
      <div>
        <Link to="/admin/alunas" className="inline-flex items-center gap-2 text-sm text-[var(--color-rose)]"><ArrowLeft size={16} /> Voltar às alunas</Link>
        <h1 className="mt-4 text-2xl font-semibold">Evolução de {profile.full_name ?? 'Aluna'}</h1>
        <p className="mt-1 text-sm text-[var(--color-medium-grey)]">
          Nível {LEVEL_LABELS[profile.level]} · Cadastrada em {formatDate(profile.created_at)}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Treinos concluídos" value={String(completed.length)} />
        <Stat label="Registros de evolução" value={String(entries.length)} />
        <Stat label="Variação de peso" value={weightChange == null ? '—' : `${weightChange > 0 ? '+' : ''}${weightChange.toFixed(1)} kg`} />
      </div>

      {latestMeasures && <section className="rounded-2xl border border-[var(--color-divider-dark)] bg-white p-5">
        <h2 className="font-semibold">Medidas mais recentes · {formatDate(latestMeasures.recorded_on)}</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          {measurements.map(({ key, label, unit }) => latestMeasures[key] != null &&
            <span key={key} className="rounded-lg bg-[var(--color-warm-grey)] px-3 py-2 text-sm">{label}: <strong>{latestMeasures[key]} {unit}</strong></span>)}
        </div>
      </section>}

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Histórico de medidas e fotos</h2>
        {entries.length === 0 ? <p className="rounded-2xl bg-white p-6 text-[var(--color-medium-grey)]">A aluna ainda não registrou medidas ou fotos.</p>
          : entries.map((entry) => <article key={entry.id} className="rounded-2xl border border-[var(--color-divider-dark)] bg-white p-5">
            <h3 className="font-semibold">{formatDate(entry.recorded_on)}</h3>
            <div className="mt-3 flex flex-wrap gap-3 text-sm">
              {measurements.map(({ key, label, unit }) => entry[key] != null &&
                <span key={key} className="rounded-lg bg-[var(--color-warm-grey)] px-3 py-2">{label}: <strong>{entry[key]} {unit}</strong></span>)}
            </div>
            {entry.notes && <p className="mt-3 text-sm text-[var(--color-medium-grey)]">{entry.notes}</p>}
            {entry.photoUrl && <img src={entry.photoUrl} alt={`Foto de evolução de ${formatDate(entry.recorded_on)}`}
              className="mt-4 max-h-96 rounded-lg object-contain" loading="lazy" />}
          </article>)}
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Treinos concluídos</h2>
        {completed.length === 0 ? <p className="rounded-2xl bg-white p-6 text-[var(--color-medium-grey)]">Nenhum treino concluído.</p>
          : <ul className="divide-y divide-[var(--color-divider-dark)] overflow-hidden rounded-2xl bg-white">
            {completed.map((row) => <li key={row.workout_id} className="flex items-center justify-between gap-3 px-5 py-4 text-sm">
              <span className="flex items-center gap-2"><CheckCircle2 size={17} className="text-[var(--color-rose)]" />{row.workout?.title_pt ?? 'Treino'}</span>
              <span className="text-[var(--color-medium-grey)]">{formatDate(row.completed_at)}</span>
            </li>)}
          </ul>}
      </section>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-[var(--color-divider-dark)] bg-white p-5">
    <p className="text-sm text-[var(--color-medium-grey)]">{label}</p>
    <p className="mt-2 text-2xl font-bold">{value}</p>
  </div>;
}
