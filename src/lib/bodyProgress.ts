import { supabase } from '@/lib/supabase';
import type { BodyProgress } from '@/lib/database.types';

export type ProgressWithPhoto = BodyProgress & { photoUrl: string | null };

export async function withSignedPhotos(rows: BodyProgress[]): Promise<ProgressWithPhoto[]> {
  return Promise.all(rows.map(async (row) => {
    if (!row.photo_path) return { ...row, photoUrl: null };
    const { data } = await supabase.storage
      .from('progress-photos')
      .createSignedUrl(row.photo_path, 60 * 60);
    return { ...row, photoUrl: data?.signedUrl ?? null };
  }));
}

export const measurements = [
  { key: 'weight_kg', label: 'Peso', unit: 'kg' },
  { key: 'waist_cm', label: 'Cintura', unit: 'cm' },
  { key: 'hip_cm', label: 'Quadril', unit: 'cm' },
  { key: 'thigh_cm', label: 'Coxa', unit: 'cm' },
] as const;
