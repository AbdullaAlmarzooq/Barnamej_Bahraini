import { supabase } from '@barnamej/supabase-client';

export const getPublicImageUrl = (bucket?: string | null, path?: string | null): string | null => {
    if (!bucket || !path) return null;
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data?.publicUrl ?? null;
};
