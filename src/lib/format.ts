export function brl(value: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(
    new Date(iso)
  );
}

export function formatDuration(seconds: number): string {
  if (!seconds) return '—';
  const m = Math.round(seconds / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r ? `${h}h${r}min` : `${h}h`;
}

const STATUS_LABELS: Record<string, string> = {
  active: 'Ativa',
  trialing: 'Período de teste',
  pending: 'Pendente',
  past_due: 'Pagamento atrasado',
  canceled: 'Cancelada',
  // Fim de período sem renovação. Diferente de past_due, que é cobrança recusada.
  expired: 'Vencida',
};

export function subscriptionStatusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status;
}

/**
 * A assinatura ainda dá acesso hoje?
 *
 * Espelha a regra do banco (`public.current_tier`): status vigente E período
 * dentro da validade. Sem isto o painel mostrava "Ativa" para quem venceu —
 * a Mirian via a aluna como ativa enquanto o servidor já bloqueava os vídeos.
 */
export function subscriptionIsCurrent(
  sub: { status: string; current_period_end?: string | null } | null | undefined
): boolean {
  if (!sub) return false;
  if (!['active', 'trialing'].includes(sub.status)) return false;
  return !sub.current_period_end || new Date(sub.current_period_end) > new Date();
}

/** Rótulo do status já considerando o vencimento do período. */
export function subscriptionLabel(
  sub: { status: string; current_period_end?: string | null } | null | undefined
): string {
  if (!sub) return 'Sem plano';
  if (['active', 'trialing'].includes(sub.status) && !subscriptionIsCurrent(sub)) {
    return 'Vencida';
  }
  return subscriptionStatusLabel(sub.status);
}

export type Billing = 'monthly' | 'annual';

/**
 * O plano anual está configurado?
 *
 * `price_annual` é o valor CHEIO de 12 meses, não a mensalidade. O seed deixou
 * a coluna igual ao mensal como marcador de "ainda não definido" — se a tela
 * levasse isso a sério, ofereceria um ano inteiro pelo preço de um mês. Um
 * anual legítimo é sempre maior que a mensalidade.
 */
export function annualConfigured(priceMonthly: number, priceAnnual: number): boolean {
  const mensal = Number(priceMonthly);
  const anual = Number(priceAnnual);
  return Number.isFinite(mensal) && Number.isFinite(anual) && mensal > 0 && anual > mensal;
}

/**
 * Quanto o plano anual economiza em relação a pagar 12 meses avulsos.
 * Devolve null quando não está configurado ou quando não há vantagem nenhuma —
 * aí a tela oferece o anual sem prometer desconto.
 */
export function annualSavings(priceMonthly: number, priceAnnual: number) {
  if (!annualConfigured(priceMonthly, priceAnnual)) return null;
  const dozeMeses = Number(priceMonthly) * 12;
  const anual = Number(priceAnnual);
  if (anual >= dozeMeses) return null;
  const economia = dozeMeses - anual;
  return {
    economia,
    percentual: Math.round((economia / dozeMeses) * 100),
    mesesGratis: Math.round(economia / Number(priceMonthly)),
  };
}

const PAYMENT_STATUS_LABELS: Record<string, string> = {
  pending: 'Pendente',
  approved: 'Aprovado',
  rejected: 'Recusado',
  refunded: 'Estornado',
  canceled: 'Cancelado',
  charged_back: 'Chargeback',
};

/** Status de PAGAMENTO em português (não confundir com o de assinatura). */
export function paymentStatusLabel(status: string): string {
  return PAYMENT_STATUS_LABELS[status] ?? status;
}

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  pix: 'Pix',
  credit_card: 'Cartão',
  boleto: 'Boleto',
};

export function paymentMethodLabel(method: string): string {
  return PAYMENT_METHOD_LABELS[method] ?? method;
}

/** 1536 -> "1,5 KB" | 2.4e9 -> "2,2 GB" */
export function formatBytes(bytes: number): string {
  if (!bytes) return '0 MB';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, i);
  return `${value.toFixed(value >= 100 || i < 2 ? 0 : 1).replace('.', ',')} ${units[i]}`;
}

/** 150 -> "2 min 30 s" | 45 -> "45 s" | 3700 -> "1 h 2 min" */
export function formatEta(seconds: number): string {
  if (!isFinite(seconds) || seconds <= 0) return 'calculando…';
  const s = Math.round(seconds);
  if (s < 60) return `${s} s`;
  const m = Math.floor(s / 60);
  if (m < 60) {
    const rest = s % 60;
    return rest ? `${m} min ${rest} s` : `${m} min`;
  }
  const h = Math.floor(m / 60);
  const restM = m % 60;
  return restM ? `${h} h ${restM} min` : `${h} h`;
}

export const LEVEL_LABELS: Record<string, string> = {
  iniciante: 'Iniciante',
  intermediario: 'Intermediário',
  avancado: 'Avançado',
};
