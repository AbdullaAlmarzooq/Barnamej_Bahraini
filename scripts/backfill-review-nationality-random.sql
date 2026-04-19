-- Backfill NULL review nationality_id values with a random active nationality.
-- Run this in the Supabase SQL Editor.

BEGIN;

-- Optional preview
SELECT COUNT(*) AS reviews_missing_nationality
FROM public.reviews
WHERE nationality_id IS NULL;

WITH nationality_pool AS (
  SELECT array_agg(id) AS ids
  FROM public.nationalities
  WHERE is_active = true
),
updated_reviews AS (
  UPDATE public.reviews AS r
  SET nationality_id = nationality_pool.ids[
    1 + floor(random() * array_length(nationality_pool.ids, 1))::int
  ]
  FROM nationality_pool
  WHERE r.nationality_id IS NULL
    AND array_length(nationality_pool.ids, 1) > 0
  RETURNING r.id
)
SELECT COUNT(*) AS reviews_updated
FROM updated_reviews;

COMMIT;
