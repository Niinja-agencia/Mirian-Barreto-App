import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import { useLanguage } from '@/context/LanguageContext';
import { useSubscription } from '@/hooks/useSubscription';
import { brl, formatDate, subscriptionStatusLabel } from '@/lib/format';
import type { Plan } from '@/lib/database.types';
import FullScreenLoader from '@/components/FullScreenLoader';

export default function SubscriptionPage() {
  const { currentLang } = useLanguage();
  const { subscription, tier, loading, refresh } = useSubscription();
  const navigate = useNavigate();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [canceling, setCanceling] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('plans').select('*').eq('active', true).order('sort_order');
      setPlans(data ?? []);
      setPlansLoading(false);
    })();
  }, []);

  async function cancel() {
    if (!subscription) return;
    if (!confirm('Tem certeza que deseja cancelar? O acesso continua até o fim do período pago.')) return;
    setCanceling(true);
    const { error } = await supabase.functions.invoke('cancel-subscription', {
      body: { subscription_id: subscription.id },
    });
    setCanceling(false);
    if (error) {
      toast.error('Não foi possível cancelar agora. Tente novamente.');
      return;
    }
    toast.success('Assinatura cancelada. Seu acesso continua até o fim do período.');
    refresh();
  }

  if (loading || plansLoading) return <FullScreenLoader />;

  const active = tier > 0;

  return (
    <div className="space-y-8">
      <h1
        className="text-[var(--color-black)] font-semibold"
        style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.8rem, 4vw, 2.6rem)' }}
      >
        Minha assinatura
      </h1>

      {/* Status atual */}
      {subscription && (
        <div className="rounded-2xl bg-[var(--color-black)] p-6 text-white">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm text-[rgba(255,255,255,0.6)]">Plano atual</p>
              <p className="text-2xl font-bold">
                {subscription.plan
                  ? currentLang === 'pt'
                    ? subscription.plan.name_pt
                    : subscription.plan.name_en
                  : '—'}
              </p>
              <p className="mt-1 text-sm text-[rgba(255,255,255,0.7)]">
                {subscription.billing === 'monthly' ? 'Mensal' : 'Anual'} ·{' '}
                {subscriptionStatusLabel(subscription.status)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-[rgba(255,255,255,0.6)]">
                {subscription.cancel_at_period_end ? 'Acesso até' : 'Próxima renovação'}
              </p>
              <p className="text-lg font-semibold">{formatDate(subscription.current_period_end)}</p>
            </div>
          </div>

          {active && !subscription.cancel_at_period_end && (
            <button
              onClick={cancel}
              disabled={canceling}
              className="mt-5 inline-flex items-center gap-2 rounded-lg border border-[rgba(255,255,255,0.25)] px-4 py-2 text-sm text-white hover:border-white disabled:opacity-60"
            >
              {canceling && <Loader2 className="animate-spin" size={14} />}
              Cancelar assinatura
            </button>
          )}
          {subscription.cancel_at_period_end && (
            <p className="mt-4 text-sm text-[var(--color-rose-light)]">
              Cancelamento agendado. Você não será cobrada novamente.
            </p>
          )}
        </div>
      )}

      {/* Planos disponíveis */}
      <div>
        <h2 className="mb-4 text-lg font-semibold text-[var(--color-black)]">
          {active ? 'Mudar de plano' : 'Escolha seu plano'}
        </h2>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {plans.map((plan) => {
            const isCurrent = subscription?.plan_id === plan.id && active;
            const features = currentLang === 'pt' ? plan.features_pt : plan.features_en;
            return (
              <div
                key={plan.id}
                className="flex flex-col rounded-2xl bg-white p-6"
                style={{
                  border: plan.highlighted
                    ? '1px solid rgba(233,30,99,0.4)'
                    : '1px solid var(--color-divider-dark)',
                }}
              >
                <p className="text-lg font-semibold text-[var(--color-black)]">
                  {currentLang === 'pt' ? plan.name_pt : plan.name_en}
                </p>
                <p className="mt-2 text-3xl font-bold text-[var(--color-black)]">
                  {brl(plan.price_monthly)}
                  <span className="text-sm font-normal text-[var(--color-medium-grey)]">/mês</span>
                </p>
                <ul className="mt-4 flex-1 space-y-2">
                  {features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-[var(--color-black)]">
                      <Check size={16} className="mt-0.5 shrink-0 text-[var(--color-rose)]" />
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  disabled={isCurrent}
                  onClick={() => navigate(`/checkout/${plan.slug}`)}
                  className="mt-6 w-full rounded-lg bg-[var(--color-rose)] py-2.5 text-sm font-semibold uppercase tracking-[0.06em] text-white transition-colors hover:bg-[var(--color-rose-hover)] disabled:cursor-default disabled:bg-[var(--color-warm-grey)] disabled:text-[var(--color-medium-grey)]"
                >
                  {isCurrent ? 'Plano atual' : plan.tier > tier ? 'Assinar' : 'Mudar para este'}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
