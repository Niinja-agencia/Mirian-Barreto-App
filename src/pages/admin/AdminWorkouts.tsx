import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Eye, EyeOff, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import {
  TextInput,
  SelectInput,
  TextArea,
  FileField,
  CheckboxField,
  FormSection,
  FormSections,
  FieldGrid,
  SubmitButton,
} from '@/components/form';
import Modal from '@/components/Modal';
import { formatDuration, LEVEL_LABELS } from '@/lib/format';
import { youtubeId } from '@/components/YouTubeEmbed';
import { uploadWorkoutVideo, waitForConversion, type UploadProgress } from '@/lib/videoHost';
import UploadOverlay from '@/components/UploadOverlay';
import type { Workout, WorkoutCategory, FitnessLevel } from '@/lib/database.types';
import FullScreenLoader from '@/components/FullScreenLoader';

interface FormState {
  id: string;
  title_pt: string;
  description_pt: string;
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
  description_pt: '',
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
  const [media, setMedia] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<FormState>({ ...empty });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [phase, setPhase] = useState<'idle' | 'uploading' | 'converting'>('idle');
  const [progress, setProgress] = useState<UploadProgress | null>(null);
  const [queuePos, setQueuePos] = useState<number | undefined>(undefined);

  async function load() {
    const [{ data: w }, { data: c }, { data: m }] = await Promise.all([
      supabase.from('workouts').select('*').order('sort_order'),
      supabase.from('workout_categories').select('*').order('sort_order'),
      // O youtube_id mora em workout_media (RLS valida plano na leitura da aluna).
      supabase.from('workout_media').select('workout_id, youtube_id'),
    ]);
    setRows(w ?? []);
    setCats(c ?? []);
    setMedia(
      Object.fromEntries(
        ((m ?? []) as { workout_id: string; youtube_id: string | null }[]).map((r) => [
          r.workout_id,
          r.youtube_id ?? '',
        ])
      )
    );
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
      description_pt: w.description_pt ?? '',
      category_id: w.category_id ?? '',
      level: w.level,
      duration_min: Math.round(w.duration_seconds / 60),
      required_tier: w.required_tier,
      published: w.published,
      video_path: w.video_path,
      thumbnail_path: w.thumbnail_path,
      youtube_id: media[w.id] ?? '',
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
    // O painel é só em português. As colunas _en continuam existindo (a vitrine
    // tem versão EN e elas são NOT NULL), então recebem o mesmo texto: melhor a
    // aluna estrangeira ver o português do que um campo vazio.
    const titulo = form.title_pt.trim();
    const descricao = form.description_pt.trim() || null;

    const payload: Record<string, unknown> = {
      title_pt: titulo,
      title_en: titulo,
      description_pt: descricao,
      description_en: descricao,
      category_id: form.category_id || null,
      level: form.level,
      duration_seconds: Math.round(form.duration_min * 60),
      required_tier: Number(form.required_tier),
      published: form.published,
      video_path: form.video_path,
      thumbnail_path: form.thumbnail_path,
    };
    // 1. salva o treino (e obtém o id, necessário para enviar o vídeo)
    const { data: saved, error } = form.id
      ? await supabase.from('workouts').update(payload).eq('id', form.id).select('id').single()
      : await supabase.from('workouts').insert(payload).select('id').single();

    if (error || !saved) {
      setSaving(false);
      return toast.error(error?.message ?? 'Erro ao salvar.');
    }

    // 1b. o link do YouTube vai para a tabela protegida, não para workouts.
    const yt = youtubeId(form.youtube_id);
    if (yt) {
      await supabase
        .from('workout_media')
        .upsert({ workout_id: saved.id, youtube_id: yt }, { onConflict: 'workout_id' });
    } else {
      await supabase.from('workout_media').delete().eq('workout_id', saved.id);
    }

    // 2. se escolheu um vídeo, envia para a VPS (que converte automaticamente)
    if (videoFile) {
      try {
        const { data: sess } = await supabase.auth.getSession();
        const token = sess.session?.access_token;
        if (!token) throw new Error('Sessão expirada.');

        setPhase('uploading');
        setProgress(null);
        const jobId = await uploadWorkoutVideo(videoFile, saved.id as string, token, setProgress);

        setPhase('converting');
        toast.info('Vídeo enviado. Convertendo — pode levar alguns minutos.');
        await waitForConversion(jobId, token, (job) =>
          setQueuePos(job.status === 'queued' ? job.position : undefined)
        );
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

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={form.id ? 'Editar treino' : 'Novo treino'}
        subtitle="Só o que estiver publicado aparece para as alunas."
        size="xl"
        footer={
          <>
            <SubmitButton type="button" variant="secondary" block={false} onClick={() => setOpen(false)}>
              Cancelar
            </SubmitButton>
            <SubmitButton form="form-treino" loading={saving} disabled={uploading} block={false}>
              Salvar treino
            </SubmitButton>
          </>
        }
      >
        <form id="form-treino" onSubmit={save}>
          <FormSections>
            <FormSection title="Identificação">
              <TextInput label="Título" value={form.title_pt} onChange={(e) => setForm({ ...form, title_pt: e.target.value })} required />
              <TextArea label="Descrição" value={form.description_pt} onChange={(e) => setForm({ ...form, description_pt: e.target.value })} />
            </FormSection>

            <FormSection
              title="Classificação"
              description="Onde o treino aparece na biblioteca e qual plano precisa ter para assistir."
            >
              <FieldGrid>
                <SelectInput
                  label="Categoria"
                  value={form.category_id}
                  onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                >
                  {cats.map((c) => (
                    <option key={c.id} value={c.id}>{c.name_pt}</option>
                  ))}
                </SelectInput>
                <SelectInput
                  label="Nível"
                  value={form.level}
                  onChange={(e) => setForm({ ...form, level: e.target.value as FitnessLevel })}
                >
                  {Object.entries(LEVEL_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </SelectInput>
              </FieldGrid>
              <FieldGrid>
                <TextInput label="Duração (min)" type="number" min={0} value={form.duration_min} onChange={(e) => setForm({ ...form, duration_min: Number(e.target.value) })} />
                <SelectInput
                  label="Plano mínimo"
                  value={form.required_tier}
                  onChange={(e) => setForm({ ...form, required_tier: Number(e.target.value) })}
                >
                  <option value={1}>1 — Básico</option>
                  <option value={2}>2 — Premium</option>
                  <option value={3}>3 — VIP</option>
                </SelectInput>
              </FieldGrid>
            </FormSection>

            <FormSection
              title="Mídia"
              description="Se houver link do YouTube, é ele que toca. Senão, toca o arquivo enviado."
            >
              <TextInput
                label="Vídeo do YouTube (link ou ID)"
                value={form.youtube_id}
                onChange={(e) => setForm({ ...form, youtube_id: e.target.value })}
                placeholder="https://youtu.be/XXXXXXXXXXX"
                hint="Opcional."
              />

              <FileField
                label="Vídeo"
                accept="video/*"
                status={form.video_path && !videoFile ? 'publicado' : null}
                selected={
                  videoFile && phase === 'idle'
                    ? `${videoFile.name} (${(videoFile.size / 1048576).toFixed(0)} MB)`
                    : null
                }
                hint="Convertido automaticamente no servidor (720p vertical). Pode enviar o arquivo original, sem limite de tamanho."
                onFile={setVideoFile}
              />

              <FileField
                label="Thumbnail"
                accept="image/*"
                status={form.thumbnail_path ? 'enviada' : null}
                hint="Imagem de capa do treino na biblioteca."
                disabled={uploading}
                onFile={(f) => handleFile('thumbnails', f)}
              />

              {uploading && (
                <p className="flex items-center gap-2 text-sm text-[var(--color-medium-grey)]">
                  <Loader2 className="animate-spin" size={14} /> Enviando arquivo…
                </p>
              )}
            </FormSection>

            <FormSection title="Publicação">
              <CheckboxField
                label="Publicado"
                description="Visível para as alunas na biblioteca de treinos."
                checked={form.published}
                onChange={(v) => setForm({ ...form, published: v })}
              />
            </FormSection>
          </FormSections>
        </form>
      </Modal>

      {/* Progresso em tela cheia do envio/conversão do vídeo.
          Na conversão o admin pode fechar: o servidor termina e publica sozinho. */}
      {phase !== 'idle' && (
        <UploadOverlay
          phase={phase}
          progress={progress}
          queuePosition={queuePos}
          onDismiss={
            phase === 'converting'
              ? () => {
                  setPhase('idle');
                  setVideoFile(null);
                  setSaving(false);
                  setOpen(false);
                  load();
                }
              : undefined
          }
        />
      )}
    </div>
  );
}
