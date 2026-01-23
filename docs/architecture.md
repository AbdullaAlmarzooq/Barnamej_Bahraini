

## Architecture Overview

```
Barnamej_Bahraini/
├── apps/
│   ├── mobile/             # Mobile app source (Expo)
│   │   ├── src/            # Screens, components, services
│   │   └── App.tsx         # Mobile entry point
│   └── admin-dashboard/    # Admin Web App (Vite/React)
├── legacy-server/          # Express.js Backend Server
├── packages/               # Shared packages (future use)
├── docs/                   # Documentation
├── assets/                 # Shared assets
├── App.ts                  # Root Expo entry
└── package.json            # Root dependencies & scripts
```

### Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Mobile App                                │
│  ┌──────────┐    ┌─────────────┐    ┌──────────────────────┐   │
│  │ Screens  │───▶│  Services   │───▶│  Local SQLite (expo) │   │
│  └──────────┘    └──────▲──────┘    └──────────▲───────────┘   │
│                         │                      │               │
│                  ┌──────┴───────┐    ┌─────────┴─────────┐     │
│                  │   API Layer  │    │  Offline Sync     │     │
│                  └──────┬───────┘    │     Queue         │     │
│                         │            └─────────┬─────────┘     │
└─────────────────────────┼──────────────────────┼───────────────┘
                          │                      │
                          ▼                      ▼
              ┌───────────────────────────────────────────┐
              │            Express.js Server              │
              │  ┌─────────────┐    ┌─────────────────┐  │
              │  │ REST API    │───▶│ SQLite (better) │  │
              │  └─────────────┘    └─────────────────┘  │
              └───────────────────────────────────────────┘
                          ▲
                          │
              ┌───────────┴───────────┐
              │   Admin Dashboard     │
              │      (Vite/React)     │
              └───────────────────────┘
```

---