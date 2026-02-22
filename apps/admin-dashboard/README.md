# Admin Dashboard

React + TypeScript + Vite admin app for managing attractions, reviews, and itineraries.

## Run Locally

```bash
cd /Users/abdullaalmarzooq/Barnamej_Bahraini/Barnamej_Bahraini/apps/admin-dashboard
npm install
npm run dev
```

Default local URL:

- `http://localhost:5173`

## Build

```bash
npm run build
npm run preview
```

## Key Notes

- Favicon is loaded from `public/favicon.png`.
- Current favicon source is synced from `/Users/abdullaalmarzooq/Barnamej_Bahraini/Barnamej_Bahraini/assets/adaptive-icon.png`.
- Itineraries page reads data directly from Supabase and is subject to RLS policies.
- Private itineraries owned by other users require explicit admin read policies in Supabase to appear in this app.

## Itinerary Behavior

- Scheduled itinerary time inputs normalize to `HH:mm` and update in place.
- Modal start/end time controls are controlled inputs to avoid stale values after refreshes.
- In the table actions column:
- `View` is always shown.
- `Edit` and `Delete` are shown only for public itineraries.

## Related Docs

- Root technical docs: `/Users/abdullaalmarzooq/Barnamej_Bahraini/Barnamej_Bahraini/README.md`
- Change history: `/Users/abdullaalmarzooq/Barnamej_Bahraini/Barnamej_Bahraini/changelog.md`
- Schema and DB triggers: `/Users/abdullaalmarzooq/Barnamej_Bahraini/Barnamej_Bahraini/docs/database/schema.md`
