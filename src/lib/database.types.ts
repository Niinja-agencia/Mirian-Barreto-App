// Tipos do banco (mantidos à mão; espelham supabase/migrations/0001_init.sql).
// Para regenerar a partir do banco:
//   supabase gen types typescript --project-id fzpmypayekcpwvhapgsk > src/lib/database.types.ts
//
// IMPORTANTE: as linhas de Row são `type` (não `interface`) de propósito —
// interfaces não são atribuíveis a `Record<string, unknown>` (sem index
// signature), o que faria o schema falhar a constraint GenericSchema do
// supabase-js e colapsar Insert/Update para `never`.

export type UserRole = 'aluno' | 'admin';
export type FitnessLevel = 'iniciante' | 'intermediario' | 'avancado';
export type BillingInterval = 'monthly' | 'annual';
export type SubscriptionStatus =
  | 'pending' | 'trialing' | 'active' | 'past_due' | 'canceled' | 'expired';
export type PaymentStatus =
  | 'pending' | 'approved' | 'rejected' | 'refunded' | 'canceled' | 'charged_back';
export type PaymentMethod = 'pix' | 'credit_card' | 'boleto';

export type Profile = {
  id: string;
  full_name: string | null;
  phone: string | null;
  role: UserRole;
  level: FitnessLevel;
  avatar_url: string | null;
  locale: string;
  created_at: string;
  updated_at: string;
};

export type Plan = {
  id: string;
  slug: string;
  tier: number;
  name_pt: string;
  name_en: string;
  description_pt: string | null;
  description_en: string | null;
  price_monthly: number;
  price_annual: number;
  features_pt: string[];
  features_en: string[];
  highlighted: boolean;
  active: boolean;
  sort_order: number;
  mp_plan_monthly_id: string | null;
  mp_plan_annual_id: string | null;
  created_at: string;
};

export type Subscription = {
  id: string;
  user_id: string;
  plan_id: string;
  status: SubscriptionStatus;
  billing: BillingInterval;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  canceled_at: string | null;
  mp_preapproval_id: string | null;
  created_at: string;
  updated_at: string;
};

export type Payment = {
  id: string;
  user_id: string | null;
  subscription_id: string | null;
  plan_id: string | null;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  mp_payment_id: string | null;
  description: string | null;
  raw: unknown;
  paid_at: string | null;
  created_at: string;
};

export type WorkoutCategory = {
  id: string;
  slug: string;
  name_pt: string;
  name_en: string;
  sort_order: number;
  created_at: string;
};

export type Workout = {
  id: string;
  category_id: string | null;
  title_pt: string;
  title_en: string;
  description_pt: string | null;
  description_en: string | null;
  level: FitnessLevel;
  duration_seconds: number;
  video_path: string | null;
  youtube_id: string | null;
  thumbnail_path: string | null;
  required_tier: number;
  published: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
};

export type WorkoutProgress = {
  id: string;
  user_id: string;
  workout_id: string;
  completed_at: string;
};

export type Announcement = {
  id: string;
  title_pt: string;
  title_en: string;
  body_pt: string | null;
  body_en: string | null;
  pinned: boolean;
  published: boolean;
  created_at: string;
};

// Onde o youtube_id passou a morar: fora de `workouts`, com RLS que valida o
// plano. Antes ele vinha junto no select do treino e o bloqueio era só visual.
export type WorkoutMedia = {
  workout_id: string;
  youtube_id: string | null;
  updated_at: string;
};

// Helper de tabela no formato esperado pelo supabase-js (GenericTable).
// Row é tipado nas leituras; Insert/Update aceitam payloads parciais.
type T<Row extends Record<string, unknown>> = {
  Row: Row;
  Insert: Record<string, unknown>;
  Update: Record<string, unknown>;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      profiles: T<Profile>;
      plans: T<Plan>;
      subscriptions: T<Subscription>;
      payments: T<Payment>;
      workout_categories: T<WorkoutCategory>;
      workouts: T<Workout>;
      workout_media: T<WorkoutMedia>;
      workout_progress: T<WorkoutProgress>;
      announcements: T<Announcement>;
    };
    Views: Record<never, never>;
    Functions: {
      current_tier: { Args: { uid: string }; Returns: number };
      is_admin: { Args: { uid: string }; Returns: boolean };
      workout_youtube_id: { Args: { p_workout_id: string }; Returns: string | null };
      // Status da conta de pagamento conectada. Nunca devolve o token — só o
      // suficiente para a tela dizer quem está conectado e desde quando.
      payment_connection_status: {
        Args: Record<string, never>;
        Returns: {
          conectado: boolean;
          provider: string;
          mp_user_id: string | null;
          nickname: string | null;
          email: string | null;
          live_mode: boolean | null;
          connected_at: string | null;
          expira_em: string | null;
        }[];
      };
    };
    Enums: {
      user_role: UserRole;
      fitness_level: FitnessLevel;
      billing_interval: BillingInterval;
      subscription_status: SubscriptionStatus;
      payment_status: PaymentStatus;
      payment_method: PaymentMethod;
    };
  };
};
