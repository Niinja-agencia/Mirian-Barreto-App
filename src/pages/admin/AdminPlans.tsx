import { useEffect, useState } from 'react';
import { Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { TextInput, SubmitButton } from '@/components/form';
import Modal from '@/components/Modal';
import { brl } from '@/lib/format';
import type { Plan } from '@/lib/database.types';
import FullScreenLoader from '@/components/FullScreenLoader';

export default function AdminPlans() {
  const [rows, setRows] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Plan | null>(null);
  const [saving, setSaving] = useState(false);

  // campos editáveis
  const [priceM, setPriceM] = useState(0);
  const [priceA, setPriceA] = useState(0);
  const [featuresPt, setFeaturesPt] = useState('');
  const [featuresEn, setFeaturesEn] = useState('');
  const [mpMonthly, setMpMonthly] = useState('');
  const [mpAnnual, setMpAnnual] = useState('');
  const [active, setActive] = useState(true);

  async function load() {
    const { data } = await supabase.from('plans').select('*').order('sort_order');
    setRows(data ?? []);
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, []);

  function openEdit(p: Plan) {
    setEditing(p);
    setPriceM(Number(p.price_monthly));
    setPriceA(Number(p.price_annual));
    setFeaturesPt(p.features_pt.join('\n'));
    setFeaturesEn(p.features_en.join('\n'));
    setMpMonthly(p.mp_plan_monthly_id ?? '');
    setMpAnnual(p.mp_plan_annual_id ?? '');
    setActive(p.active);
    setOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    const { error } = await supabase
      .from('plans')
      .update({
        price_monthly: priceM,
        price_annual: priceA,
        features_pt: featuresPt.split('\n').map((s) => s.trim()).filter(Boolean),
        features_en: featuresEn.split('\n').map((s) => s.trim()).filter(Boolean),
        mp_plan_monthly_id: mpMonthly.trim() || null,
        mp_plan_annual_id: mpAnnual.trim() || null,
        active,
      })
      .eq('id', editing.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success('Plano atualizado!');
    setOpen(false);
    load();
  }

  if (loading) return <FullScreenLoader />;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-[var(--color-black)]">Planos</h1>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
        {rows.map((p) => (
          <div key={p.id} className="rounded-2xl bg-white p-5" style={{ border: '1px solid var(--color-divider-dark)' }}>
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold text-[var(--color-black)]">{p.name_pt}</p>
                <p className="text-xs text-[var(--color-medium-grey)]">Tier {p.tier} · {p.active ? 'Ativo' : 'Inativo'}</p>
              </div>
              <button onClick={() => openEdit(p)} className="p-2 text-[var(--color-medium-grey)] hover:text-[var(--color-rose)]">
                <Pencil size={16} />
              </button>
            </div>
            <p className="mt-3 text-2xl font-bold text-[var(--color-black)]">{brl(Number(p.price_monthly))}<span className="text-sm font-normal text-[var(--color-medium-grey)]">/mês</span></p>
            <p className="text-sm text-[var(--color-medium-grey)]">{brl(Number(p.price_annual))}/ano</p>
            <p className="mt-2 text-xs text-[var(--color-medium-grey)]">
              MP: {p.mp_plan_monthly_id ? '✓ mensal' : '— mensal'} / {p.mp_plan_annual_id ? '✓ anual' : '— anual'}
            </p>
          </div>
        ))}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title={`Editar ${editing?.name_pt ?? ''}`}>
        <form onSubmit={save} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <TextInput label="Preço mensal (R$)" type="number" step="0.01" value={priceM} onChange={(e) => setPriceM(Number(e.target.value))} />
            <TextInput label="Preço anual (R$)" type="number" step="0.01" value={priceA} onChange={(e) => setPriceA(Number(e.target.value))} />
          </div>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-[var(--color-black)]">Recursos PT (um por linha)</span>
            <textarea value={featuresPt} onChange={(e) => setFeaturesPt(e.target.value)} rows={4} className="w-full rounded-lg border border-[var(--color-divider-dark)] px-3.5 py-2.5 text-sm" />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-[var(--color-black)]">Recursos EN (um por linha)</span>
            <textarea value={featuresEn} onChange={(e) => setFeaturesEn(e.target.value)} rows={4} className="w-full rounded-lg border border-[var(--color-divider-dark)] px-3.5 py-2.5 text-sm" />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <TextInput label="MP plan ID (mensal)" value={mpMonthly} onChange={(e) => setMpMonthly(e.target.value)} placeholder="preapproval_plan_id" />
            <TextInput label="MP plan ID (anual)" value={mpAnnual} onChange={(e) => setMpAnnual(e.target.value)} placeholder="preapproval_plan_id" />
          </div>
          <label className="flex items-center gap-2 text-sm text-[var(--color-black)]">
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} /> Plano ativo
          </label>
          <SubmitButton loading={saving}>Salvar</SubmitButton>
        </form>
      </Modal>
    </div>
  );
}
