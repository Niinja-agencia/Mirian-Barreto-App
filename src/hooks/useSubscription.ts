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
    // Assinatura mais recente do usuário (com dados do plano)
    const { data } = await supabase
      .from('subscriptions')
      .select('*, plan:plans(*)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const sub = (data as unknown as ActiveSubscription | null) ?? null;
    setSubscription(sub);

    const valid =
      sub &&
      ACTIVE.includes(sub.status) &&
      (!sub.current_period_end || new Date(sub.current_period_end) > new Date());
    setTier(valid && sub?.plan ? sub.plan.tier : 0);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    load();
  }, [load]);

  return { subscription, tier, loading, refresh: load };
}
