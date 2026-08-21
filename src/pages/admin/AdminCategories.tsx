import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { TextInput, FormSection, FormSections, FieldGrid, SubmitButton } from '@/components/form';
import Modal from '@/components/Modal';
import type { WorkoutCategory } from '@/lib/database.types';
import FullScreenLoader from '@/components/FullScreenLoader';

const empty = { id: '', slug: '', name_pt: '', name_en: '', sort_order: 0 };

export default function AdminCategories() {
  const [rows, setRows] = useState<WorkoutCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ ...empty });
  const [saving, setSaving] = useState(false);

  async function load() {
    const { data } = await supabase.from('workout_categories').select('*').order('sort_order');
    setRows(data ?? []);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  function openNew() {
    setForm({ ...empty });
    setOpen(true);
  }
  function openEdit(c: WorkoutCategory) {
    setForm({ id: c.id, slug: c.slug, name_pt: c.name_pt, name_en: c.name_en, sort_order: c.sort_order });
    setOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const payload = {
      slug: form.slug.trim(),
      name_pt: form.name_pt.trim(),
      name_en: form.name_en.trim(),
      sort_order: Number(form.sort_order),
    };
    const { error } = form.id
      ? await supabase.from('workout_categories').update(payload).eq('id', form.id)
      : await supabase.from('workout_categories').insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success('Categoria salva!');
    setOpen(false);
    load();
  }

  async function remove(id: string) {
    if (!confirm('Excluir esta categoria?')) return;
    const { error } = await supabase.from('workout_categories').delete().eq('id', id);
    if (error) return toast.error(error.message);
    load();
  }

  if (loading) return <FullScreenLoader />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-[var(--color-black)]">Categorias</h1>
        <button
          onClick={openNew}
          className="flex items-center gap-2 rounded-lg bg-[var(--color-rose)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--color-rose-hover)]"
        >
          <Plus size={16} /> Nova
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl bg-white" style={{ border: '1px solid var(--color-divider-dark)' }}>
        {rows.map((c) => (
          <div
            key={c.id}
            className="flex items-center justify-between border-b border-[var(--color-divider-dark)] px-5 py-3 last:border-0"
          >
            <div>
              <p className="font-medium text-[var(--color-black)]">{c.name_pt}</p>
              <p className="text-xs text-[var(--color-medium-grey)]">{c.slug} · {c.name_en}</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => openEdit(c)} className="p-2 text-[var(--color-medium-grey)] hover:text-[var(--color-rose)]">
                <Pencil size={16} />
              </button>
              <button onClick={() => remove(c.id)} className="p-2 text-[var(--color-medium-grey)] hover:text-red-600">
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={form.id ? 'Editar categoria' : 'Nova categoria'}
        subtitle="Como o grupo de treinos aparece na biblioteca."
        footer={
          <>
            <SubmitButton type="button" variant="secondary" block={false} onClick={() => setOpen(false)}>
              Cancelar
            </SubmitButton>
            <SubmitButton form="form-categoria" loading={saving} block={false}>
              Salvar
            </SubmitButton>
          </>
        }
      >
        <form id="form-categoria" onSubmit={save}>
          <FormSections>
            <FormSection title="Nome">
              <FieldGrid>
                <TextInput label="Nome (PT)" value={form.name_pt} onChange={(e) => setForm({ ...form, name_pt: e.target.value })} required />
                <TextInput label="Nome (EN)" value={form.name_en} onChange={(e) => setForm({ ...form, name_en: e.target.value })} required />
              </FieldGrid>
            </FormSection>

            <FormSection title="Organização">
              <FieldGrid>
                <TextInput
                  label="Slug (url)"
                  value={form.slug}
                  onChange={(e) => setForm({ ...form, slug: e.target.value })}
                  required
                  hint="Vai no endereço da página. Letras minúsculas e hífen."
                />
                <TextInput
                  label="Ordem"
                  type="number"
                  value={form.sort_order}
                  onChange={(e) => setForm({ ...form, sort_order: Number(e.target.value) })}
                  hint="Menor número aparece primeiro."
                />
              </FieldGrid>
            </FormSection>
          </FormSections>
        </form>
      </Modal>
    </div>
  );
}
