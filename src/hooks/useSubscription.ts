import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { Plan, Subscription } from '@/lib/database.types';

export interface ActiveSubscription extends Subscription {
  plan: Plan | null;
}

interface UseSubscriptionResult {
  subscription: ActiveSubscription | null;
  tier: number;          // 0 = sem acesso ativo
  loading: boolean;
  refresh: () => Promise<void>;
}

const ACTIVE = ['active', 'trialing'];

export function useSubscription(): UseSubscriptionResult {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<ActiveSubscription | null>(null);
  const [tier, setTier] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) {
      setSubscription(null);
      setTier(0);
      setLoading(false);
      return;
    }
    setLoading(true);
    // Todas as assinaturas do usuário (com dados do plano).
    //
    // Antes isto pegava só a MAIS RECENTE. Como o checkout cria uma linha
    // 'pending' a cada clique em "Pagar", uma aluna ativa que abrisse o
    // checkout e desistisse passava a ver tudo bloqueado — enquanto o servidor
    // (current_tier / video-url / VPS) continuava liberando. Aqui espelhamos a
    // regra do banco: vale o maior tier entre as assinaturas vigentes.
    const { data } = await supabase
      .from('subscriptions')
      .select('*, plan:plans(*)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    const all = (data as unknown as ActiveSubscription[] | null) ?? [];
    const vigente = (s: ActiveSubscription) =>
      ACTIVE.includes(s.status) &&
      (!s.current_period_end || new Date(s.current_period_end) > new Date());

    const ativas = all.filter(vigente);
    // A que dá mais acesso; empate desempata pela mais recente (já ordenado).
    const melhor = ativas.reduce<ActiveSubscription | null>(
      (best, s) => (!best || (s.plan?.tier ?? 0) > (best.plan?.tier ?? 0) ? s : best),
      null
    );

    // Exibe a vigente quando houver; senão a mais recente, para a tela de
    // assinatura conseguir mostrar o estado (vencida, cancelada, pendente).
    setSubscription(melhor ?? all[0] ?? null);
    setTier(melhor?.plan ? melhor.plan.tier : 0);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  return { subscription, tier, loading, refresh: load };
}
