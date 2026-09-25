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

const active = (sub: ActiveSubscription) =>
  (['active', 'trialing'].includes(sub.status) || (sub.status === 'canceled' && sub.cancel_at_period_end))
  && (!sub.current_period_end || new Date(sub.current_period_end) > new Date());

export function useSubscription(): UseSubscriptionResult {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<ActiveSubscription | null>(null);
  const [tier, setTier] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    // Mantém o plano vigente visível enquanto uma troca de plano está pendente.
    const { data } = await supabase
      .from('subscriptions')
      .select('*, plan:plans(*)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    const subs = (data as unknown as ActiveSubscription[]) ?? [];
    const sub = subs.filter(active).sort((a, b) =>
      (b.plan?.tier ?? 0) - (a.plan?.tier ?? 0)
    )[0] ?? subs[0] ?? null;
    setSubscription(sub);
    setTier(sub && active(sub) && sub.plan ? sub.plan.tier : 0);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  return { subscription: user ? subscription : null, tier: user ? tier : 0, loading: user ? loading : false, refresh: load };
}
