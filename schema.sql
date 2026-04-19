-- Review demographics/profile migration
-- Date: 2026-04-19

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS nationality_id uuid REFERENCES public.nationalities(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_nationality
  ON public.profiles(nationality_id)
  WHERE deleted_at IS NULL;
