# Changelog

## 2026-02-22

### Admin Dashboard (`apps/admin-dashboard`)

- Updated itinerary edit time handling in `/Users/abdullaalmarzooq/Barnamej_Bahraini/Barnamej_Bahraini/apps/admin-dashboard/src/pages/Itineraries.tsx`.
- Added `toTimeInputValue()` normalization to safely parse `HH:mm`, `HH:mm:ss`, and timestamp-like values.
- Fixed scheduled time updates to always send normalized `HH:mm` values.
- Converted scheduled start/end fields in the Edit Itinerary modal to controlled inputs (`attractionTimes` state) to keep values in sync after refresh/re-render.
- Kept existing validation that end time must be after start time.

- Improved Edit Itinerary modal spacing and alignment in `/Users/abdullaalmarzooq/Barnamej_Bahraini/Barnamej_Bahraini/apps/admin-dashboard/src/pages/Itineraries.css`.
- Added consistent spacing between sections/fields/table cells.
- Matched heights/alignment for add-attraction controls (select, start time, end time, add button).

- Updated actions column behavior in `/Users/abdullaalmarzooq/Barnamej_Bahraini/Barnamej_Bahraini/apps/admin-dashboard/src/pages/Itineraries.tsx`.
- `View` remains visible for all itineraries.
- `Edit` and `Delete` are shown only when `itinerary.is_public` is `true`.

- Updated dashboard favicon source in `/Users/abdullaalmarzooq/Barnamej_Bahraini/Barnamej_Bahraini/apps/admin-dashboard/index.html`.
- Admin favicon file now uses `/Users/abdullaalmarzooq/Barnamej_Bahraini/Barnamej_Bahraini/assets/adaptive-icon.png` copied to `/Users/abdullaalmarzooq/Barnamej_Bahraini/Barnamej_Bahraini/apps/admin-dashboard/public/favicon.png`.

### Supabase SQL Changes (manual, outside repo files)

- Fixed overlap trigger function for `time` columns:
- Replaced invalid `tstzrange(time, time)` usage in `prevent_time_overlap()` with `tsrange(...)` built from a dummy date + `time`.

- Updated `update_itinerary_totals()` logic to be mode-aware:
- `scheduled`: duration = `latest_end_time - earliest_start_time`.
- `flexible`: duration = sum of attraction `estimated_duration_minutes`.
- Confirmed expected sample behavior: `09:30` to `16:00` should produce `390` minutes.

- Added trigger enforcement so scheduled itineraries force auto-sort:
- `BEFORE INSERT OR UPDATE` on `itineraries` via `enforce_auto_sort_enabled()`.
- Rule applied: if `NEW.mode = 'scheduled'`, then `NEW.auto_sort_enabled = true`.

### Access / Visibility Notes

- Private itineraries from other users still do not appear in admin list due to RLS, not UI filtering.
- Existing `itineraries` select policy allows:
- public itineraries, or owner-only private itineraries.
- Admin-wide private visibility requires an additional admin read policy (JWT role claim or profile-based admin check).

### Login / User Context Notes

- No new authentication flow was introduced in this session.
- Existing logic in the admin itinerary page continues to:
- read the authenticated user from Supabase auth,
- fetch profile (`full_name`, `email`) from `profiles`,
- fall back to auth metadata/email when profile row does not exist.
