import { supabase } from '@/lib/supabase';

export function thumbUrl(path: string | null): string | null {
  if (!path) return null;
  return supabase.storage.from('thumbnails').getPublicUrl(path).data.publicUrl;
}
