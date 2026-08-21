import { useEffect, useState } from 'react';
import { Pencil } from 'lucide-react';
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
    setMpMonthly(p.mp_plan_monthly_id ?? '');
    setMpAnnual(p.mp_plan_annual_id ?? '');
    setActive(p.active);
    setOpen(true);
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    // Painel só em português; a lista _en (usada na versão EN da landing)
    // recebe a mesma lista.
    const recursos = featuresPt.split('\n').map((s) => s.trim()).filter(Boolean);
    const { error } = await supabase
      .from('plans')
      .update({
        price_monthly: priceM,
        price_annual: priceA,
        features_pt: recursos,
        features_en: recursos,
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

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={`Editar ${editing?.name_pt ?? ''}`}
        subtitle="O preço daqui é o que a landing e o checkout mostram."
        size="xl"
        footer={
          <>
            <SubmitButton type="button" variant="secondary" block={false} onClick={() => setOpen(false)}>
              Cancelar
            </SubmitButton>
            <SubmitButton form="form-plano" loading={saving} block={false}>
              Salvar
            </SubmitButton>
          </>
        }
      >
        <form id="form-plano" onSubmit={save}>
          <FormSections>
            <FormSection
              title="Preço"
              description="O seletor mensal/anual só aparece para a aluna quando o anual for menor que 12x o mensal."
            >
              <FieldGrid>
                <TextInput label="Preço mensal (R$)" type="number" step="0.01" min={0} value={priceM} onChange={(e) => setPriceM(Number(e.target.value))} />
                <TextInput label="Preço anual (R$)" type="number" step="0.01" min={0} value={priceA} onChange={(e) => setPriceA(Number(e.target.value))} />
              </FieldGrid>
            </FormSection>

            <FormSection title="Recursos" description="Um por linha. É a lista que aparece no cartão do plano.">
              <TextArea label="Recursos" rows={6} value={featuresPt} onChange={(e) => setFeaturesPt(e.target.value)} />
            </FormSection>

            <FormSection title="Mercado Pago" description="O preapproval_plan_id de cada frequência.">
              <FieldGrid>
                <TextInput label="Plano mensal" value={mpMonthly} onChange={(e) => setMpMonthly(e.target.value)} placeholder="preapproval_plan_id" />
                <TextInput label="Plano anual" value={mpAnnual} onChange={(e) => setMpAnnual(e.target.value)} placeholder="preapproval_plan_id" />
              </FieldGrid>
            </FormSection>

            <FormSection title="Disponibilidade">
              <CheckboxField
                label="Plano ativo"
                description="Desmarcado, some da landing e ninguém consegue assinar."
                checked={active}
                onChange={setActive}
              />
            </FormSection>
          </FormSections>
        </form>
      </Modal>
    </div>
  );
}
