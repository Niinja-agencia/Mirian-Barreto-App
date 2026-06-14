import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { Lock, Clock, PlayCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/context/LanguageContext';
import { useSubscription } from '@/hooks/useSubscription';
import { formatDuration, LEVEL_LABELS } from '@/lib/format';
import type { Workout, WorkoutCategory } from '@/lib/database.types';
import FullScreenLoader from '@/components/FullScreenLoader';

function thumbUrl(path: string | null): string | null {
  if (!path) return null;
  return supabase.storage.from('thumbnails').getPublicUrl(path).data.publicUrl;
}

export default function WorkoutList() {
  const { currentLang } = useLanguage();
  const { tier } = useSubscription();
  const [categories, setCategories] = useState<WorkoutCategory[]>([]);
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [cat, setCat] = useState<string>('all');
  const [level, setLevel] = useState<string>('all');

  useEffect(() => {
    (async () => {
      const [{ data: cats }, { data: w }] = await Promise.all([
        supabase.from('workout_categories').select('*').order('sort_order'),
        supabase.from('workouts').select('*').eq('published', true).order('sort_order'),
      ]);
      setCategories(cats ?? []);
      setWorkouts(w ?? []);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(
    () =>
      workouts.filter(
        (w) =>
          (cat === 'all' || w.category_id === cat) && (level === 'all' || w.level === level)
      ),
    [workouts, cat, level]
  );

  if (loading) return <FullScreenLoader />;

  return (
    <div className="space-y-6">
      <h1
        className="text-[var(--color-black)] font-semibold"
        style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.8rem, 4vw, 2.6rem)' }}
      >
        Treinos
      </h1>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3">
        <select
          value={cat}
          onChange={(e) => setCat(e.target.value)}
          className="rounded-lg border border-[var(--color-divider-dark)] bg-white px-3 py-2 text-sm text-[var(--color-black)]"
        >
          <option value="all">Todas as categorias</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {currentLang === 'pt' ? c.name_pt : c.name_en}
            </option>
          ))}
        </select>
        <select
          value={level}
          onChange={(e) => setLevel(e.target.value)}
          className="rounded-lg border border-[var(--color-divider-dark)] bg-white px-3 py-2 text-sm text-[var(--color-black)]"
        >
          <option value="all">Todos os níveis</option>
          {Object.entries(LEVEL_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </div>

      {filtered.length === 0 ? (
        <p className="text-[var(--color-medium-grey)]">Nenhum treino encontrado para esse filtro.</p>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((w) => {
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
                      <PlayCircle size={40} />
                    </div>
                  )}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity group-hover:opacity-100">
                    {locked ? (
                      <Lock className="text-white" size={32} />
                    ) : (
                      <PlayCircle className="text-white" size={44} />
                    )}
                  </div>
                  {locked && (
                    <span className="absolute right-2 top-2 flex items-center gap-1 rounded bg-[var(--color-black)]/80 px-2 py-1 text-xs font-medium text-white">
                      <Lock size={12} /> Bloqueado
                    </span>
                  )}
                </div>
                <div className="p-4">
                  <p className="font-semibold text-[var(--color-black)] line-clamp-1">{title}</p>
                  <div className="mt-2 flex items-center gap-3 text-xs text-[var(--color-medium-grey)]">
                    <span>{LEVEL_LABELS[w.level]}</span>
                    <span className="flex items-center gap-1">
                      <Clock size={12} /> {formatDuration(w.duration_seconds)}
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
