import { useCallback, useEffect, useRef, useState } from 'react';
import { format } from 'date-fns';
import { Link } from 'react-router';
import { CheckCircle2, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { useLanguage } from '@/context/LanguageContext';
import { formatDate } from '@/lib/format';
import { measurements, withSignedPhotos, type ProgressWithPhoto } from '@/lib/bodyProgress';
import type { BodyProgress, Workout } from '@/lib/database.types';
import FullScreenLoader from '@/components/FullScreenLoader';

interface WorkoutRow {
  workout_id: string;
  completed_at: string;
  workout: Pick<Workout, 'title_pt' | 'title_en'> | null;
}
type MeasureKey = typeof measurements[number]['key'];
const emptyMeasures: Record<MeasureKey, string> = {
  weight_kg: '', waist_cm: '', hip_cm: '', thigh_cm: '',
};

export default function Progress() {
  const { user } = useAuth();
  const { currentLang } = useLanguage();
  const [workouts, setWorkouts] = useState<WorkoutRow[]>([]);
  const [entries, setEntries] = useState<ProgressWithPhoto[]>([]);
  const [available, setAvailable] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [recordedOn, setRecordedOn] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [values, setValues] = useState<Record<MeasureKey, string>>(emptyMeasures);
  const [notes, setNotes] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const photoInput = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    if (!user) return;
    const [workoutsRes, availableRes, progressRes] = await Promise.all([
      supabase.from('workout_progress')
        .select('workout_id, completed_at, workout:workouts(title_pt, title_en)')
        .eq('user_id', user.id).order('completed_at', { ascending: false }),
      supabase.from('workouts').select('*', { count: 'exact', head: true }).eq('published', true),
      supabase.from('body_progress').select('*').eq('user_id', user.id)
        .order('recorded_on', { ascending: false }).order('created_at', { ascending: false }),
    ]);
    if (progressRes.error) toast.error('Não foi possível carregar suas medidas.');
    setWorkouts((workoutsRes.data as unknown as WorkoutRow[]) ?? []);
    setAvailable(availableRes.count ?? 0);
    setEntries(await withSignedPhotos((progressRes.data as BodyProgress[]) ?? []));
    setLoading(false);
  }, [user]);

  useEffect(() => { void load(); }, [load]);

  async function addEntry(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (!photo && measurements.every(({ key }) => !values[key])) {
      toast.error('Informe uma medida ou selecione uma foto.');
      return;
    }
    if (photo && (!['image/jpeg', 'image/png', 'image/webp'].includes(photo.type) || photo.size > 10 * 1024 * 1024)) {
      toast.error('A foto deve ser JPG, PNG ou WebP e ter até 10 MB.');
      return;
    }
    setSaving(true);
    let photoPath: string | null = null;
    try {
      if (photo) {
        const ext = photo.type === 'image/png' ? 'png' : photo.type === 'image/webp' ? 'webp' : 'jpg';
        photoPath = `${user.id}/${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage.from('progress-photos').upload(photoPath, photo, { contentType: photo.type });
        if (error) throw error;
      }
      const payload = Object.fromEntries(measurements.map(({ key }) => [
        key, values[key] ? Number(values[key].replace(',', '.')) : null,
      ]));
      const { error } = await supabase.from('body_progress').insert({
        user_id: user.id, recorded_on: recordedOn, ...payload,
        photo_path: photoPath, notes: notes.trim() || null,
      });
      if (error) throw error;
      setValues({ ...emptyMeasures });
      setNotes('');
      setPhoto(null);
      if (photoInput.current) photoInput.current.value = '';
      toast.success('Evolução registrada.');
      await load();
    } catch (error) {
      if (photoPath) await supabase.storage.from('progress-photos').remove([photoPath]);
      toast.error('Não foi possível salvar: ' + (error as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function removeEntry(entry: ProgressWithPhoto) {
    if (!confirm('Excluir este registro de evolução?')) return;
    const { error } = await supabase.from('body_progress').delete().eq('id', entry.id);
    if (error) return toast.error('Não foi possível excluir o registro.');
    if (entry.photo_path) await supabase.storage.from('progress-photos').remove([entry.photo_path]);
    toast.success('Registro excluído.');
    await load();
  }

  if (loading) return <FullScreenLoader />;
  const done = workouts.length;
  const pct = available > 0 ? Math.round((done / available) * 100) : 0;

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-semibold text-[var(--color-black)]" style={{ fontFamily: 'var(--font-display)' }}>Meu progresso</h1>
      <div className="rounded-2xl border border-[var(--color-divider-dark)] bg-white p-6">
        <div className="flex items-end justify-between">
          <div><p className="text-3xl font-bold">{done}</p><p className="text-sm text-[var(--color-medium-grey)]">de {available} treinos concluídos</p></div>
          <p className="text-2xl font-bold text-[var(--color-rose)]">{pct}%</p>
        </div>
        <div className="mt-4 h-2.5 w-full overflow-hidden rounded-full bg-[var(--color-warm-grey)]">
          <div className="h-full rounded-full bg-[var(--color-rose)]" style={{ width: `${pct}%` }} />
        </div>
      </div>

      <section className="rounded-2xl border border-[var(--color-divider-dark)] bg-white p-6">
        <h2 className="text-xl font-semibold">Registrar minha evolução</h2>
        <p className="mt-1 text-sm text-[var(--color-medium-grey)]">Adicione medidas e fotos. Só você e a administração podem vê-las.</p>
        <form onSubmit={addEntry} className="mt-5 space-y-4">
          <label className="block max-w-xs text-sm font-medium">Data
            <input type="date" required max={format(new Date(), 'yyyy-MM-dd')} value={recordedOn}
              onChange={(e) => setRecordedOn(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-[var(--color-divider-dark)] px-3 py-2" />
          </label>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {measurements.map(({ key, label, unit }) => (
              <label key={key} className="text-sm font-medium">{label} ({unit})
                <input type="number" min="0.01" max="499.99" step="0.01" value={values[key]}
                  onChange={(e) => setValues((previous) => ({ ...previous, [key]: e.target.value }))}
                  className="mt-1 block w-full rounded-lg border border-[var(--color-divider-dark)] px-3 py-2" />
              </label>
            ))}
          </div>
          <label className="block text-sm font-medium">Foto de progresso (JPG, PNG ou WebP, até 10 MB)
            <input ref={photoInput} type="file" accept="image/jpeg,image/png,image/webp"
              onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} className="mt-1 block w-full text-sm" />
          </label>
          <label className="block text-sm font-medium">Observações (opcional)
            <textarea maxLength={1000} rows={3} value={notes} onChange={(e) => setNotes(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-[var(--color-divider-dark)] px-3 py-2" />
          </label>
          <button type="submit" disabled={saving}
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-rose)] px-5 py-2.5 font-semibold text-white disabled:opacity-60">
            {saving && <Loader2 className="animate-spin" size={16} />} Salvar evolução
          </button>
        </form>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Medidas e fotos</h2>
        {entries.length === 0 ? <p className="rounded-2xl bg-white p-6 text-[var(--color-medium-grey)]">Nenhum registro ainda.</p>
          : entries.map((entry) => (
            <article key={entry.id} className="rounded-2xl border border-[var(--color-divider-dark)] bg-white p-5">
              <div className="flex items-center justify-between gap-4">
                <h3 className="font-semibold">{formatDate(entry.recorded_on)}</h3>
                <button type="button" onClick={() => void removeEntry(entry)} aria-label="Excluir registro"
                  className="text-[var(--color-medium-grey)] hover:text-red-600"><Trash2 size={17} /></button>
              </div>
              <div className="mt-3 flex flex-wrap gap-3 text-sm">
                {measurements.map(({ key, label, unit }) => entry[key] != null && (
                  <span key={key} className="rounded-lg bg-[var(--color-warm-grey)] px-3 py-2">{label}: <strong>{entry[key]} {unit}</strong></span>
                ))}
              </div>
              {entry.notes && <p className="mt-3 text-sm text-[var(--color-medium-grey)]">{entry.notes}</p>}
              {entry.photoUrl && <img src={entry.photoUrl} alt={`Evolução de ${formatDate(entry.recorded_on)}`}
                className="mt-4 max-h-80 rounded-lg object-contain" loading="lazy" />}
            </article>
          ))}
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold">Treinos concluídos</h2>
        {done === 0 ? <p className="rounded-2xl bg-white p-6 text-[var(--color-medium-grey)]">
          Você ainda não concluiu nenhum treino. <Link to="/app/treinos" className="text-[var(--color-rose)]">Começar agora</Link>
        </p> : <ul className="divide-y divide-[var(--color-divider-dark)] overflow-hidden rounded-2xl bg-white">
          {workouts.map((row) => <li key={row.workout_id}>
            <Link to={`/app/treinos/${row.workout_id}`} className="flex items-center justify-between gap-3 px-5 py-4 hover:bg-[var(--color-warm-grey)]">
              <span className="flex items-center gap-3"><CheckCircle2 className="text-[var(--color-rose)]" size={18} />
                {row.workout ? (currentLang === 'pt' ? row.workout.title_pt : row.workout.title_en) : 'Treino'}
              </span>
              <span className="text-sm text-[var(--color-medium-grey)]">{formatDate(row.completed_at)}</span>
            </Link>
          </li>)}</ul>}
      </section>
    </div>
  );
}
