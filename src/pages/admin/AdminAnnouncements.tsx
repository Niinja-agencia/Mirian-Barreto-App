import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Pin, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { TextInput, SubmitButton } from '@/components/form';
import Modal from '@/components/Modal';
import { formatDate } from '@/lib/format';
import type { Announcement } from '@/lib/database.types';
import FullScreenLoader from '@/components/FullScreenLoader';

const empty = {
  id: '',
  title_pt: '',
  title_en: '',
  body_pt: '',
  body_en: '',
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
      title_en: a.title_en,
      body_pt: a.body_pt ?? '',
      body_en: a.body_en ?? '',
      pinned: a.pinned,
      published: a.published,
    });
    setOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const payload = {
      title_pt: form.title_pt.trim(),
      title_en: form.title_en.trim(),
      body_pt: form.body_pt.trim() || null,
      body_en: form.body_en.trim() || null,
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

      <Modal open={open} onClose={() => setOpen(false)} title={form.id ? 'Editar aviso' : 'Novo aviso'}>
        <form onSubmit={save} className="space-y-4">
          <TextInput label="Título (PT)" value={form.title_pt} onChange={(e) => setForm({ ...form, title_pt: e.target.value })} required />
          <TextInput label="Título (EN)" value={form.title_en} onChange={(e) => setForm({ ...form, title_en: e.target.value })} required />
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-[var(--color-black)]">Mensagem (PT)</span>
            <textarea value={form.body_pt} onChange={(e) => setForm({ ...form, body_pt: e.target.value })} rows={3} className="w-full rounded-lg border border-[var(--color-divider-dark)] px-3.5 py-2.5 text-sm" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-[var(--color-black)]">Mensagem (EN)</span>
            <textarea value={form.body_en} onChange={(e) => setForm({ ...form, body_en: e.target.value })} rows={3} className="w-full rounded-lg border border-[var(--color-divider-dark)] px-3.5 py-2.5 text-sm" />
          </label>
          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-sm text-[var(--color-black)]">
              <input type="checkbox" checked={form.pinned} onChange={(e) => setForm({ ...form, pinned: e.target.checked })} /> Fixar no topo
            </label>
            <label className="flex items-center gap-2 text-sm text-[var(--color-black)]">
              <input type="checkbox" checked={form.published} onChange={(e) => setForm({ ...form, published: e.target.checked })} /> Publicado
            </label>
          </div>
          <SubmitButton loading={saving}>Salvar aviso</SubmitButton>
        </form>
      </Modal>
    </div>
  );
}
