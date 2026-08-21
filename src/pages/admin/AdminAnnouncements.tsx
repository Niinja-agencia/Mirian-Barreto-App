import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Pin, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import {
  TextInput,
  TextArea,
  CheckboxField,
  FormSection,
  FormSections,
  FieldGrid,
  SubmitButton,
} from '@/components/form';
import Modal from '@/components/Modal';
import { formatDate } from '@/lib/format';
import type { Announcement } from '@/lib/database.types';
import FullScreenLoader from '@/components/FullScreenLoader';

const empty = {
  id: '',
  title_pt: '',
  body_pt: '',
  pinned: false,
  published: true,
};

export default function AdminAnnouncements() {
  const [rows, setRows] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ ...empty });
  const [saving, setSaving] = useState(false);

  async function load() {
    const { data } = await supabase
      .from('announcements')
      .select('*')
      .order('pinned', { ascending: false })
      .order('created_at', { ascending: false });
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
  function openEdit(a: Announcement) {
    setForm({
      id: a.id,
      title_pt: a.title_pt,
      body_pt: a.body_pt ?? '',
      pinned: a.pinned,
      published: a.published,
    });
    setOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    // Painel só em português; as colunas _en (usadas na versão EN do app)
    // recebem o mesmo texto, em vez de ficarem vazias.
    const titulo = form.title_pt.trim();
    const corpo = form.body_pt.trim() || null;
    const payload = {
      title_pt: titulo,
      title_en: titulo,
      body_pt: corpo,
      body_en: corpo,
      pinned: form.pinned,
      published: form.published,
    };
    const { error } = form.id
      ? await supabase.from('announcements').update(payload).eq('id', form.id)
      : await supabase.from('announcements').insert(payload);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success('Aviso salvo!');
    setOpen(false);
    load();
  }

  async function remove(id: string) {
    if (!confirm('Excluir este aviso?')) return;
    const { error } = await supabase.from('announcements').delete().eq('id', id);
    if (error) return toast.error(error.message);
    load();
  }

  if (loading) return <FullScreenLoader />;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-[var(--color-black)]">Avisos</h1>
        <button
          onClick={openNew}
          className="flex items-center gap-2 rounded-lg bg-[var(--color-rose)] px-4 py-2 text-sm font-semibold text-white hover:bg-[var(--color-rose-hover)]"
        >
          <Plus size={16} /> Novo aviso
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl bg-white" style={{ border: '1px solid var(--color-divider-dark)' }}>
        {rows.length === 0 ? (
          <p className="px-5 py-6 text-center text-[var(--color-medium-grey)]">Nenhum aviso ainda.</p>
        ) : (
          rows.map((a) => (
            <div
              key={a.id}
              className="flex items-start justify-between gap-4 border-b border-[var(--color-divider-dark)] px-5 py-4 last:border-0"
            >
              <div>
                <p className="flex items-center gap-2 font-medium text-[var(--color-black)]">
                  {a.pinned && <Pin size={14} className="text-[var(--color-rose)]" />}
                  {a.title_pt}
                  {a.published ? (
                    <Eye size={14} className="text-green-600" />
                  ) : (
                    <EyeOff size={14} className="text-[var(--color-medium-grey)]" />
                  )}
                </p>
                <p className="mt-0.5 line-clamp-1 text-sm text-[var(--color-medium-grey)]">{a.body_pt}</p>
                <p className="mt-1 text-xs text-[var(--color-medium-grey)]">{formatDate(a.created_at)}</p>
              </div>
              <div className="flex shrink-0 gap-2">
                <button onClick={() => openEdit(a)} className="p-2 text-[var(--color-medium-grey)] hover:text-[var(--color-rose)]">
                  <Pencil size={16} />
                </button>
                <button onClick={() => remove(a.id)} className="p-2 text-[var(--color-medium-grey)] hover:text-red-600">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={form.id ? 'Editar aviso' : 'Novo aviso'}
        subtitle="Aparece para as alunas na área logada."
        size="xl"
        footer={
          <>
            <SubmitButton type="button" variant="secondary" block={false} onClick={() => setOpen(false)}>
              Cancelar
            </SubmitButton>
            <SubmitButton form="form-aviso" loading={saving} block={false}>
              Salvar aviso
            </SubmitButton>
          </>
        }
      >
        <form id="form-aviso" onSubmit={save}>
          <FormSections>
            <FormSection title="Conteúdo">
              <TextInput label="Título" value={form.title_pt} onChange={(e) => setForm({ ...form, title_pt: e.target.value })} required />
              <TextArea label="Mensagem" rows={5} value={form.body_pt} onChange={(e) => setForm({ ...form, body_pt: e.target.value })} />
            </FormSection>

            <FormSection title="Publicação">
              <FieldGrid>
                <CheckboxField
                  label="Fixar no topo"
                  description="Sobe na frente dos demais avisos."
                  checked={form.pinned}
                  onChange={(v) => setForm({ ...form, pinned: v })}
                />
                <CheckboxField
                  label="Publicado"
                  description="Desmarcado, fica só como rascunho."
                  checked={form.published}
                  onChange={(v) => setForm({ ...form, published: v })}
                />
              </FieldGrid>
            </FormSection>
          </FormSections>
        </form>
      </Modal>
    </div>
  );
}
