

## Architecture Overview

```
Barnamej_Bahraini/
├── App.tsx                 # Mobile app entry point
├── src/                    # Mobile app source code
│   ├── screens/            # 7 screen components
│   ├── components/         # Reusable UI components
│   ├── services/           # API & database services
│   ├── db/                 # Database layer (client, migrations, queue)
│   ├── navigation/         # Navigation configuration
│   ├── api/                # API endpoint definitions
│   └── utils/              # Utility functions
├── server/                 # Express.js backend
│   ├── index.js            # Main server file (~530 lines)
│   └── public/             # Static assets
├── admin-dashboard/        # React admin web app
│   └── src/
│       ├── pages/          # Dashboard, Attractions, Reviews, Itineraries
│       ├── components/     # Layout and Common components
│       ├── api/            # API client
│       └── types/          # TypeScript types
├── assets/                 # App assets & preloaded database
├── scripts/                # Utility scripts for photo sync
└── package.json            # Root dependencies
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