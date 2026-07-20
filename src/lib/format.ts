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
};

export function subscriptionStatusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status;
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
