import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Eye, EyeOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { TextInput, SubmitButton } from '@/components/form';
import Modal from '@/components/Modal';
import { formatDuration, LEVEL_LABELS } from '@/lib/format';
import { youtubeId } from '@/components/YouTubeEmbed';
import { uploadWorkoutVideo, waitForConversion } from '@/lib/videoHost';
import type { Workout, WorkoutCategory, FitnessLevel } from '@/lib/database.types';
import FullScreenLoader from '@/components/FullScreenLoader';

interface FormState {
  id: string;
  title_pt: string;
  title_en: string;
  description_pt: string;
  description_en: string;
  category_id: string;
  level: FitnessLevel;
  duration_min: number;
  required_tier: number;
  published: boolean;
  video_path: string | null;
  thumbnail_path: string | null;
  youtube_id: string;
}

const empty: FormState = {
  id: '',
  title_pt: '',
  title_en: '',
  description_pt: '',
  description_en: '',
  category_id: '',
  level: 'iniciante',
  duration_min: 0,
  required_tier: 1,
  published: false,
  video_path: null,
  thumbnail_path: null,
  youtube_id: '',
};

async function uploadTo(bucket: string, file: File): Promise<string> {
  const ext = file.name.split('.').pop();
  const path = `${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
  if (error) throw error;
  return path;
}

export default function AdminWorkouts() {
  const [rows, setRows] = useState<Workout[]>([]);
  const [cats, setCats] = useState<WorkoutCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>({ ...empty });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [phase, setPhase] = useState<'idle' | 'uploading' | 'converting'>('idle');
  const [uploadPct, setUploadPct] = useState(0);

  async function load() {
    const [{ data: w }, { data: c }] = await Promise.all([
      supabase.from('workouts').select('*').order('sort_order'),
      supabase.from('workout_categories').select('*').order('sort_order'),
    ]);
    setRows(w ?? []);
    setCats(c ?? []);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  function openNew() {
    setForm({ ...empty, category_id: cats[0]?.id ?? '' });
    setOpen(true);
  }
  function openEdit(w: Workout) {
    setForm({
      id: w.id,
      title_pt: w.title_pt,
      title_en: w.title_en,
      description_pt: w.description_pt ?? '',
      description_en: w.description_en ?? '',
      category_id: w.category_id ?? '',
      level: w.level,
      duration_min: Math.round(w.duration_seconds / 60),
      required_tier: w.required_tier,
      published: w.published,
      video_path: w.video_path,
      thumbnail_path: w.thumbnail_path,
      youtube_id: w.youtube_id ?? '',
    });
    setOpen(true);
  }

  async function handleFile(bucket: 'workout-videos' | 'thumbnails', file: File | null) {
    if (!file) return;
    setUploading(true);
    try {
      const path = await uploadTo(bucket, file);
      setForm((f) => ({
        ...f,
        ...(bucket === 'workout-videos' ? { video_path: path } : { thumbnail_path: path }),
      }));
      toast.success('Upload concluído.');
    } catch (e) {
      toast.error('Falha no upload: ' + (e as Error).message);
    } finally {
      setUploading(false);
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const payload: Record<string, unknown> = {
      title_pt: form.title_pt.trim(),
      title_en: form.title_en.trim(),
      description_pt: form.description_pt.trim() || null,
      description_en: form.description_en.trim() || null,
      category_id: form.category_id || null,
      level: form.level,
      duration_seconds: Math.round(form.duration_min * 60),
      required_tier: Number(form.required_tier),
      published: form.published,
      video_path: form.video_path,
      thumbnail_path: form.thumbnail_path,
      youtube_id: youtubeId(form.youtube_id),
    };
    // 1. salva o treino (e obtém o id, necessário para enviar o vídeo)
    const { data: saved, error } = form.id
      ? await supabase.from('workouts').update(payload).eq('id', form.id).select('id').single()
      : await supabase.from('workouts').insert(payload).select('id').single();

    if (error || !saved) {
      setSaving(false);
      return toast.error(error?.message ?? 'Erro ao salvar.');
    }

    // 2. se escolheu um vídeo, envia para a VPS (que converte automaticamente)
    if (videoFile) {
      try {
        const { data: sess } = await supabase.auth.getSession();
        const token = sess.session?.access_token;
        if (!token) throw new Error('Sessão expirada.');

        setPhase('uploading');
        setUploadPct(0);
        const jobId = await uploadWorkoutVideo(videoFile, saved.id as string, token, setUploadPct);

        setPhase('converting');
        toast.info('Vídeo enviado. Convertendo — pode levar alguns minutos.');
        await waitForConversion(jobId, token);
        toast.success('Vídeo convertido e publicado!');
      } catch (err) {
        setPhase('idle');
        setSaving(false);
        return toast.error((err as Error).message);
      }
    }

    setPhase('idle');
    setVideoFile(null);
    setSaving(false);
    toast.success('Treino salvo!');
    setOpen(false);
    load();
  }

  async function togglePublish(w: Workout) {
    await supabase.from('workouts').update({ published: !w.published }).eq('id', w.id);
    load();
  }

  async function remove(id: string) {
    if (!confirm('Excluir este treino?')) return;
    const { error } = await supabase.from('workouts').delete().eq('id', id);
    if (error) return toast.error(error.message);
    load();
  }

  if (loading) return <FullScreenLoader />;

  const catName = (id: string | null) => cats.find((c) => c.id === id)?.name_pt ?? '—';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-[var(--color-black)]">Treinos</h1>
        <button
          onClick={openNew}
          className="flex items-center gap-2 rounded-lg bg-[var(--color-rose)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--color-rose-hover)]"
        >
          <Plus size={16} /> Novo treino
        </button>
      </div>

      <div className="overflow-x-auto rounded-2xl bg-white" style={{ border: '1px solid var(--color-divider-dark)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--color-divider-dark)] text-left text-[var(--color-medium-grey)]">
              <th className="px-4 py-3 font-medium">Título</th>
              <th className="px-4 py-3 font-medium">Categoria</th>
              <th className="px-4 py-3 font-medium">Nível</th>
              <th className="px-4 py-3 font-medium">Duração</th>
              <th className="px-4 py-3 font-medium">Tier</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-[var(--color-medium-grey)]">
                  Nenhum treino cadastrado.
                </td>
              </tr>
            ) : (
              rows.map((w) => (
                <tr key={w.id} className="border-b border-[var(--color-divider-dark)] last:border-0">
                  <td className="px-4 py-3 text-[var(--color-black)]">{w.title_pt}</td>
                  <td className="px-4 py-3 text-[var(--color-medium-grey)]">{catName(w.category_id)}</td>
                  <td className="px-4 py-3 text-[var(--color-medium-grey)]">{LEVEL_LABELS[w.level]}</td>
                  <td className="px-4 py-3 text-[var(--color-medium-grey)]">{formatDuration(w.duration_seconds)}</td>
                  <td className="px-4 py-3 text-[var(--color-medium-grey)]">{w.required_tier}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => togglePublish(w)}
                      className={`flex items-center gap-1 rounded px-2 py-1 text-xs font-medium ${
                        w.published ? 'bg-green-100 text-green-700' : 'bg-[var(--color-warm-grey)] text-[var(--color-medium-grey)]'
                      }`}
                    >
                      {w.published ? <Eye size={12} /> : <EyeOff size={12} />}
                      {w.published ? 'Publicado' : 'Rascunho'}
                    </button>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => openEdit(w)} className="p-2 text-[var(--color-medium-grey)] hover:text-[var(--color-rose)]">
                        <Pencil size={16} />
                      </button>
                      <button onClick={() => remove(w.id)} className="p-2 text-[var(--color-medium-grey)] hover:text-red-600">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={form.id ? 'Editar treino' : 'Novo treino'}>
        <form onSubmit={save} className="space-y-4">
          <TextInput label="Título (PT)" value={form.title_pt} onChange={(e) => setForm({ ...form, title_pt: e.target.value })} required />
          <TextInput label="Título (EN)" value={form.title_en} onChange={(e) => setForm({ ...form, title_en: e.target.value })} required />

          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-[var(--color-black)]">Descrição (PT)</span>
            <textarea
              value={form.description_pt}
              onChange={(e) => setForm({ ...form, description_pt: e.target.value })}
              rows={2}
              className="w-full rounded-lg border border-[var(--color-divider-dark)] px-3.5 py-2.5 text-sm"
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-[var(--color-black)]">Categoria</span>
              <select
                value={form.category_id}
                onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                className="w-full rounded-lg border border-[var(--color-divider-dark)] px-3 py-2.5 text-sm"
              >
                {cats.map((c) => (
                  <option key={c.id} value={c.id}>{c.name_pt}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-[var(--color-black)]">Nível</span>
              <select
                value={form.level}
                onChange={(e) => setForm({ ...form, level: e.target.value as FitnessLevel })}
                className="w-full rounded-lg border border-[var(--color-divider-dark)] px-3 py-2.5 text-sm"
              >
                {Object.entries(LEVEL_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <TextInput label="Duração (min)" type="number" value={form.duration_min} onChange={(e) => setForm({ ...form, duration_min: Number(e.target.value) })} />
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-[var(--color-black)]">Plano mínimo (tier)</span>
              <select
                value={form.required_tier}
                onChange={(e) => setForm({ ...form, required_tier: Number(e.target.value) })}
                className="w-full rounded-lg border border-[var(--color-divider-dark)] px-3 py-2.5 text-sm"
              >
                <option value={1}>1 — Básico</option>
                <option value={2}>2 — Premium</option>
                <option value={3}>3 — VIP</option>
              </select>
            </label>
          </div>

          {/* Vídeo do YouTube */}
          <TextInput
            label="Vídeo do YouTube (link ou ID) — opcional"
            value={form.youtube_id}
            onChange={(e) => setForm({ ...form, youtube_id: e.target.value })}
            placeholder="https://youtu.be/XXXXXXXXXXX"
          />
          <p className="-mt-2 text-xs text-[var(--color-medium-grey)]">
            Se preenchido, o treino usa o vídeo do YouTube. Senão, usa o arquivo enviado abaixo.
          </p>

          {/* Uploads */}
          <div className="grid grid-cols-1 gap-3">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-[var(--color-black)]">
                Vídeo {form.video_path && !videoFile && <span className="text-green-600">✓ publicado</span>}
              </span>
              <input
                type="file"
                accept="video/*"
                onChange={(e) => setVideoFile(e.target.files?.[0] ?? null)}
                className="text-sm"
              />
              <span className="mt-1 block text-xs text-[var(--color-medium-grey)]">
                O vídeo é convertido automaticamente no servidor (720p vertical, otimizado). Pode
                enviar o arquivo original, sem limite de tamanho.
              </span>
              {videoFile && phase === 'idle' && (
                <span className="mt-1 block text-xs text-[var(--color-black)]">
                  Selecionado: {videoFile.name} ({(videoFile.size / 1048576).toFixed(0)} MB)
                </span>
              )}
              {phase === 'uploading' && (
                <span className="mt-2 block">
                  <span className="text-xs text-[var(--color-black)]">Enviando… {uploadPct}%</span>
                  <span className="mt-1 block h-2 w-full overflow-hidden rounded-full bg-[var(--color-warm-grey)]">
                    <span
                      className="block h-full bg-[var(--color-rose)] transition-all"
                      style={{ width: `${uploadPct}%` }}
                    />
                  </span>
                </span>
              )}
              {phase === 'converting' && (
                <span className="mt-2 flex items-center gap-2 text-xs text-[var(--color-black)]">
                  <Loader2 className="animate-spin" size={14} /> Convertendo no servidor… pode levar
                  alguns minutos. Não feche esta janela.
                </span>
              )}
            </label>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-[var(--color-black)]">
                Thumbnail {form.thumbnail_path && <span className="text-green-600">✓ enviada</span>}
              </span>
              <input type="file" accept="image/*" onChange={(e) => handleFile('thumbnails', e.target.files?.[0] ?? null)} className="text-sm" />
            </label>
            {uploading && (
              <p className="flex items-center gap-2 text-sm text-[var(--color-medium-grey)]">
                <Loader2 className="animate-spin" size={14} /> Enviando arquivo…
              </p>
            )}
          </div>

          <label className="flex items-center gap-2 text-sm text-[var(--color-black)]">
            <input type="checkbox" checked={form.published} onChange={(e) => setForm({ ...form, published: e.target.checked })} />
            Publicado (visível para as alunas)
          </label>

          <SubmitButton loading={saving} disabled={uploading}>Salvar treino</SubmitButton>
        </form>
      </Modal>
    </div>
  );
}
