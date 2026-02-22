# Barnamej Bahraini - Technical Documentation

**A comprehensive tourism application for discovering Bahrain's attractions**

> Version 1.0.0 | Expo SDK 54 | React Native 0.81.5 | Express.js 5

---

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture Overview](#architecture-overview)
3. [Backend Documentation](#backend-documentation)
4. [Mobile App Documentation](#mobile-app-documentation)
5. [Admin Dashboard Documentation](#admin-dashboard-documentation)
6. [Database Schema](#database-schema)
7. [Setup & Installation](#setup--installation)
8. [Configuration & Environment](#configuration--environment)
9. [Code Quality Analysis](#code-quality-analysis)
10. [Security Considerations](#security-considerations)
11. [Performance & Scalability](#performance--scalability)
12. [Assumptions & Missing Information](#assumptions--missing-information)
13. [Changelog](#changelog)

---

## Project Overview

**Barnamej Bahraini** ("Bahrain's Program" in Arabic) is a full-stack tourism application designed to help users explore Bahrain's attractions, create personalized itineraries, and share reviews. The project aligns with Bahrain's Economic Vision 2030, focusing on sustainability, competitiveness, and fairness in tourism.

### Key Features

- 📍 **Attraction Discovery**: Browse, search, and filter tourist attractions
- 🗺️ **Itinerary Planning**: Create, manage, and share trip itineraries
- ⭐ **Reviews System**: Multi-criteria rating system (Price, Cleanliness, Service, Experience)
- 🔄 **Offline Support**: Supabase-backed sync queue with background sync
- 🖥️ **Admin Dashboard**: Web-based management interface

### Tech Stack

| Component | Technology |
|-----------|------------|
| Mobile App | React Native (Expo SDK 54), TypeScript |
| Backend Server | Express.js 5, Supabase (PostgreSQL) |
| Admin Dashboard | React (Vite), TypeScript |
| Database | Supabase (PostgreSQL) |
| Navigation | React Navigation 7 |

---

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
┌────────────────────────────────────────────────────────────────┐
│                        Mobile App                                │
│  ┌──────────┐    ┌─────────────┐    ┌──────────────────────┐   │
│  │ Screens  │───▶│  Services   │───▶│  Supabase Client     │   │
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
              │  ┌─────────────┐    ┌─────────────────┐   │
              │  │ REST API    │───▶│ Supabase (PG)   │   │
              │  └─────────────┘    └─────────────────┘   │
              └───────────────────────────────────────────┘
                          ▲
                          │
              ┌───────────┴───────────┐
              │   Admin Dashboard     │
              │      (Vite/React)     │
              └───────────────────────┘
```

---

## Backend Documentation

### Server Architecture

The backend is a single-file Express.js server (`legacy-server/index.js`) running on port 3000.

#### Key Components

| Component | Purpose |
|-----------|---------|
| CORS Middleware | Cross-origin request handling |
| body-parser | JSON request body parsing |
| Static Files | Serves `/public` and `/assets` directories |
| Supabase Client/REST | PostgreSQL database access |

### API Routes Reference

#### Public Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/attractions` | List all attractions |
| GET | `/attractions/featured` | Top 3 rated attractions |
| GET | `/attractions/:id` | Single attraction details |
| GET | `/attractions/:id/reviews` | Reviews for attraction |
| GET | `/nationalities` | List nationalities for reviews |
| POST | `/reviews` | Submit a new review |
| GET | `/itineraries` | List itineraries (with `?public=true/false/all`) |
| POST | `/itineraries` | Create new itinerary |
| GET | `/itineraries/:id` | Itinerary with attractions |
| POST | `/itineraries/:id/attractions` | Add attraction to itinerary |
| PUT | `/itineraries/attractions/:id` | Update itinerary attraction details |
| DELETE | `/itineraries/:id/attractions/:attractionId` | Remove from itinerary |
| DELETE | `/itineraries/:id` | Delete entire itinerary |

#### Admin Endpoints (Prefix: `/api/admin`)

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/reviews` | All reviews with attraction names |
| DELETE | `/reviews/:id` | Delete a review |
| POST | `/attractions` | Create attraction |
| PUT | `/attractions/:id` | Update attraction |
| DELETE | `/attractions/:id` | Delete attraction (cascades reviews) |
| PUT | `/itineraries/:id` | Update itinerary metadata |
| GET | `/statistics` | Dashboard statistics |
| GET | `/attractions/:id/photos` | Get attraction photos |
| POST | `/attractions/:id/photos` | Add photo to attraction |
| DELETE | `/photos/:photoId` | Delete a photo |
| PUT | `/photos/:photoId/set-primary` | Set photo as primary |

### Key Business Logic

#### Review Rating Calculation
Review ratings are computed in PostgreSQL using a generated column (`overall_rating`) and a trigger that updates `attractions.avg_rating` and `attractions.total_reviews`. See `docs/database/schema.md`.

#### Itinerary Price Recalculation
When attractions are added/removed from itineraries, totals are automatically recalculated by a PostgreSQL trigger (`update_itinerary_totals`) in Supabase.

#### Itinerary Duration by Mode
`update_itinerary_totals` is mode-aware:
- `flexible`: duration = sum of attraction `estimated_duration_minutes`.
- `scheduled`: duration = `latest scheduled_end_time - earliest scheduled_start_time`.

Scheduled itineraries also enforce `auto_sort_enabled = true` via a `BEFORE INSERT OR UPDATE` trigger on `itineraries`.

---

## Mobile App Documentation

### Frontend Architecture

The mobile app follows a modular architecture with clear separation of concerns:

| Layer | Location | Purpose |
|-------|----------|---------|
| Screens | `apps/mobile/src/screens/` | Page-level components |
| Components | `apps/mobile/src/components/` | Reusable UI elements |
| Services | `apps/mobile/src/services/` | Business logic & data access |
| DB Layer | `apps/mobile/src/db/` | Supabase client, sync |
| Navigation | `apps/mobile/src/navigation/` | Routing configuration |

### Navigation Structure

```
NavigationContainer
├── Tab.Navigator (Bottom Tabs)
│   ├── Home (HomeScreen)
│   ├── Attractions (AttractionsStackNavigator)
│   │   ├── AttractionsList
│   │   ├── AttractionDetails
│   │   └── WriteReview
│   ├── Itineraries (ItinerariesStackNavigator)
│   │   ├── ItineraryList
│   │   └── ItineraryDetails
│   └── About (AboutScreen)
```

### Screen Components

#### `HomeScreen.tsx`
**Purpose**: Landing page with featured attractions and recent itineraries

**Features**:
- Time-based greeting (Morning/Afternoon/Evening)
- Featured attractions carousel (top 5 by rating)
- Recent itineraries list (last 3)
- Quick action navigation cards
- Call-to-action for trip planning

**Data Source**: `getFeaturedAttractions()`, `getItineraries()` via Supabase

---

#### `AttractionsListScreen.tsx`
**Purpose**: Searchable, filterable list of all attractions

**Features**:
- Real-time search (name and location)
- Category filter chips (All, Historical, Landmark, Nature, Religious, Museum)
- FlatList with `AttractionCard` components

**State Management**: Local `useState` for `attractions`, `filteredAttractions`, `searchQuery`, `selectedCategory`

---

#### `AttractionDetailsScreen.tsx`
**Purpose**: Full details view for a single attraction

**Features**:
- Photo carousel with pagination dots
- Rating breakdown by category
- Review list display
- "Add to Itinerary" and "Write Review" actions

---

#### `ItineraryListScreen.tsx`
**Purpose**: Manage personal and community itineraries

**Features**:
- Tab switching (My Itineraries / Community)
- Modal for creating new itinerary
- "Add to Itinerary" mode for adding attractions
- Public/private toggle switch

**Special Mode**: When navigated with `addToItineraryId` param, clicking an itinerary adds the attraction to it.

---

#### `ItineraryDetailsScreen.tsx`
**Purpose**: View and manage itinerary contents

**Features**:
- Numbered attraction list with thumbnails
- Edit modal for start/end time, price, notes
- Manual reorder via Move Up/Down buttons
- Auto-sort toggle (sorts by start_time)
- Delete itinerary functionality

**Reordering Logic**: 
- Manual mode: Up/Down buttons visible
- Auto-sort mode: Attractions sorted by `start_time`, untimed items at end
- Public itineraries: Reordering disabled

---

#### `WriteReviewScreen.tsx`
**Purpose**: Multi-criteria review submission form

**Features**:
- Star rating inputs for 4 categories
- Name and comment text inputs
- Local save with sync queue

---

#### `AboutScreen.tsx`
**Purpose**: App information and Vision 2030 alignment

### Reusable Components

#### `AttractionCard.tsx`
A card component for displaying attraction previews with:
- Image (from local photos)
- Name, category, rating badge
- `onPress` navigation handler

#### `Button.tsx`
A styled button with three variants:
- `primary`: Solid red background
- `secondary`: White with red text
- `outline`: Transparent with red border

### Database Layer (`apps/mobile/src/db/`)

#### `client.ts` - Database Client
**Purpose**: Singleton Supabase client initialization

**Key Features**:
- Lazy initialization with `getDB()`
- Centralized Supabase configuration

```typescript
export const getDB = async () => DatabaseClient.getInstance().getDB();
```

#### `migrator.ts` - Migration System
**Purpose**: Supabase schema changes are managed in PostgreSQL migrations (see `docs/database/schema.md`)

#### `queue/queue.ts` - Sync Queue
**Purpose**: Offline-first data persistence

**Queue Operations**:
- `addToQueue(type, payload, priority)` - Queue pending sync
- `getNextBatch(limit)` - Fetch pending items
- `markAsSynced(id)` - Remove after successful sync
- `incrementRetry(id, error)` - Handle failures (max 5 retries)

#### `queue/sync.ts` - Background Sync Service
**Purpose**: Automatic synchronization when network available

**Sync Process**:
1. Listen for network state changes via `NetInfo`
2. When connected, process queue batch
3. Call appropriate API based on item type
4. Handle success (delete from queue) or failure (increment retry)

```typescript
export const initSyncService = () => {
  NetInfo.addEventListener(state => {
    if (state.isConnected) syncQueue();
  });
};
```

### Services Layer

#### `database.ts` - Data Access Service
**Purpose**: High-level data operations using Supabase (PostgreSQL)

**Key Functions**:

| Function | Purpose |
|----------|---------|
| `initDatabase()` | Initialize DB and start sync service |
| `getAllAttractions()` | Fetch all attractions |
| `getFeaturedAttractions()` | Top 5 by rating |
| `getAttractionById(id)` | Single attraction |
| `addReview(review)` | Save and sync via Supabase |
| `getReviewsForAttraction(id)` | Reviews for attraction |
| `createItinerary(name, desc, isPublic, creator)` | Create + queue |
| `getItineraries()` | All with counts |
| `getPublicItineraries()` | Public only |
| `getItineraryDetails(id)` | Full with attractions |
| `addToItinerary(itineraryId, attractionId)` | Add with price |
| `updateItineraryAttraction()` | Edit details |
| `reorderItineraryAttractions()` | Manual sort |
| `toggleItineraryAutoSort()` | Enable/disable auto-sort |
| `removeFromItinerary()` | Remove + normalize |
| `deleteItinerary()` | Delete itinerary |

#### `api.ts` - Remote API Client
**Purpose**: HTTP client for server communication

**Configuration**:
```typescript
const API_BASE_URL = __DEV__
  ? 'http://192.168.100.38:3000'  // Development IP
  : 'https://api.yourapp.com';    // Production URL
```

**Features**:
- Network status check before requests
- JSON request/response handling
- Error handling with descriptive messages
- Legacy offline queue (in-memory)

### Utilities

#### `attractionPhotos.ts`
**Purpose**: Auto-generated photo mappings for offline access

```typescript
export const attractionPhotos: { [key: number]: any[] } = {
  1: [require('../../assets/AttractionsPhotos/1/...'), ...],
  // ...
};

export const getFirstPhoto = (attractionId: number) => { ... };
export const getPhotosForAttraction = (attractionId: number) => { ... };
```

**Generated by**: `npm run sync-photos` in server folder

---

## Admin Dashboard Documentation

### Technology Stack
- **Framework**: React with TypeScript
- **Build Tool**: Vite
- **Routing**: React Router DOM
- **Styling**: Vanilla CSS

### Pages

| Page | Route | Purpose |
|------|-------|---------|
| Dashboard | `/` | Statistics overview and quick actions |
| Attractions | `/attractions` | CRUD for attractions with photo management |
| Reviews | `/reviews` | View and moderate user reviews |
| Itineraries | `/itineraries` | View and manage user itineraries |

### Dashboard Statistics
Displays:
- Total Attractions count
- Total Reviews count
- Total Itineraries count
- Average Rating across all attractions

---

## Database Schema

### Database Overview

The primary database is Supabase (PostgreSQL). It uses UUID primary keys, enums for domain values, Row Level Security (RLS), triggers/functions for computed fields, and views for common queries. Relationship data is modeled via junction tables (e.g., `itinerary_attractions`). For the authoritative schema, see `docs/database/schema.md`.

The database schema is defined in Supabase/PostgreSQL and documented here:

- `docs/database/schema.md` (single source of truth)

Key characteristics:
- UUID primary keys
- Enums for domain values (e.g., attraction categories, review status)
- Row Level Security (RLS) policies
- Triggers and functions for ratings and itinerary totals
- Views for common queries (e.g., attractions with primary photo, itineraries detailed)
- Relationship tables such as `itinerary_attractions`

---

## Setup & Installation

### Prerequisites

- Node.js 18+ and npm
- Expo CLI (`npm install -g expo-cli`)
- Android Studio (for Android emulator) or Xcode (for iOS simulator)
- Physical device: Expo Go app

### Step-by-Step Setup

#### 1. Clone and Install Root Dependencies

```bash
cd Barnamej_Bahraini
npm install
```

#### 2. Install Server Dependencies

```bash
cd legacy-server
npm install
```

#### 3. Install Admin Dashboard Dependencies

```bash
cd apps/admin-dashboard
npm install
```

#### 4. Configure API URL (Important!)

Edit `apps/mobile/src/services/api.ts` and update the IP address:

```typescript
const API_BASE_URL = __DEV__
  ? 'http://YOUR_LOCAL_IP:3000'  // ← Replace with your machine's IP
  : 'https://api.yourapp.com';
```

**Find your IP**:
- Windows: Run `ipconfig` in CMD
- Mac/Linux: Run `ifconfig` or `ip addr`

#### 5. Configure Supabase Environment

Set the following environment variables (e.g., in a `.env` file):

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

#### 6. Start the Backend Server

```bash
cd legacy-server
npm run dev    # Development with auto-reload
# or
npm start      # Production mode
```

Server runs at `http://localhost:3000`

#### 7. Start the Mobile App

```bash
cd ..  # Return to root
npm start
# or
expo start
```

Then:
- Press `a` for Android emulator
- Press `i` for iOS simulator
- Scan QR with Expo Go app for physical device

#### 8. Start Admin Dashboard (Optional)

```bash
cd apps/admin-dashboard
npm run dev
```

Dashboard runs at `http://localhost:5173`

### Running All Services

**Recommended Terminal Setup**:
```
Terminal 1 (Server):     cd legacy-server && npm run dev
Terminal 2 (Mobile):     npm start
Terminal 3 (Dashboard):  cd apps/admin-dashboard && npm run dev
```

---

## Configuration & Environment

### Required Configuration

| Location | Setting | Description |
|----------|---------|-------------|
| `apps/mobile/src/services/api.ts` | `API_BASE_URL` | Backend server URL |
| `.env` | `SUPABASE_URL` | Supabase project URL |
| `.env` | `SUPABASE_ANON_KEY` | Supabase anon public key |
| `legacy-server/index.js` | `PORT` | Server port (default: 3000) |
| `app.json` | Various | Expo app configuration |

### app.json Settings

```json
{
  "expo": {
    "name": "Barnamej_Bahraini",
    "slug": "Barnamej_Bahraini",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/icon.png",
    "splash": {
      "image": "./assets/adaptive-icon.png",
      "resizeMode": "contain",
      "backgroundColor": "#ffffff"
    },
    "plugins": ["expo-font", "expo-asset"]
  }
}
```

### Database Location

- **Primary Database**: Supabase-hosted PostgreSQL (cloud)
- **Local Storage**: No file-based SQLite database

### Development Flags

In `apps/mobile/src/db/client.ts`:
```typescript
const DEV_FORCE_DB_RESET = false; // Set true to reset DB on each launch
```

---

## Code Quality Analysis

### Naming Conventions

| Element | Convention | Example |
|---------|------------|---------|
| Files (Screens) | PascalCase with suffix | `HomeScreen.tsx` |
| Files (Utils) | camelCase | `attractionPhotos.ts` |
| Functions | camelCase | `getAttractionById()` |
| Constants | UPPER_SNAKE_CASE | `API_BASE_URL` |
| Interfaces | PascalCase | `AttractionCardProps` |
| Database Columns | snake_case | `attraction_id` |

### Strengths

1. **TypeScript Usage**: Proper typing throughout the mobile app
2. **Modular Architecture**: Clear separation between screens, components, and services
3. **Offline-First Design**: Sync queue with Supabase backend
4. **Database Governance**: Centralized schema in Supabase (`schema.md`)
5. **Consistent Styling**: Cohesive red (#D71A28) brand color
6. **Error Handling**: Try-catch blocks with user-friendly alerts

### Areas for Improvement

1. **Backend Single File**: `legacy-server/index.js` is 530+ lines; consider splitting into routes/controllers
2. **No Authentication**: Admin endpoints lack access control
3. **Limited Type Safety**: Server uses plain JavaScript
4. **Missing Tests**: No unit or integration tests
5. **Hardcoded Strings**: UI text could use i18n

### Error Handling Patterns

```typescript
// Mobile App Pattern
try {
  const data = await getData();
  setData(data);
} catch (error) {
  Alert.alert('Error', 'User-friendly message');
  console.error(error);
}

// Server Pattern
app.post('/route', (req, res) => {
  try {
    // operation
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});
```

---

## Security Considerations

### Current Vulnerabilities

| Issue | Location | Risk | Recommendation |
|-------|----------|------|----------------|
| No Authentication | All endpoints | HIGH | Add JWT auth |
| No Input Validation | Server routes | MEDIUM | Add validation |
| RLS Policies | ✅ Enabled | LOW | Enforce row-level access |
| CORS Wide Open | Server | MEDIUM | Restrict origins |
| No Rate Limiting | Server | MEDIUM | Add express-rate-limit |
| Hardcoded IP | `api.ts` | LOW | Use env variables |

### SQL Injection Protection

Database access is mediated through Supabase with Row Level Security (RLS) policies and server-side functions, reducing direct SQL exposure from the clients.

### Recommended Security Additions

1. **Authentication**: JWT tokens for admin endpoints
2. **Input Validation**: Use `express-validator` for request validation
3. **CORS Configuration**: Restrict to known origins
4. **Rate Limiting**: Prevent abuse
5. **Environment Variables**: Move sensitive config to `.env`

---

## Performance & Scalability

### Current Optimizations

1. **Supabase Indexing**: Indexed fields for common queries
2. **Computed Fields**: Cached totals and ratings
3. **Views**: Pre-joined views for common reads
4. **Batch Sync**: Queue processes items in batches
5. **Optimistic Updates**: UI updates before server response

### Bottlenecks

1. **No Caching**: Every request hits the database
2. **Sync on Every Network Change**: Could be rate-limited
3. **No Pagination**: All attractions loaded at once

### Scaling Recommendations

| Improvement | Effort | Impact |
|-------------|--------|--------|
| Add Redis caching | Medium | High |
| Implement pagination | Low | Medium |
| Add CDN for images | Medium | High |
| Throttle sync service | Low | Low |

---

## Assumptions & Missing Information

### Assumptions Made

1. **No Production Deployment**: Project appears to be in development
2. **Single Developer**: Codebase optimized for solo development
3. **Demo Data**: Attractions are pre-seeded Bahraini landmarks
4. **User Accounts via Supabase Auth**: Schema includes `auth.users`/profiles; confirm app login flow
5. **Bahrain Context**: Prices in BHD, locations are Bahraini cities

### Missing Information

| Item | Status | Notes |
|------|--------|-------|
| Production API URL | Placeholder | Update before deployment |
| App Store Assets | Missing | Need app icons, screenshots |
| Privacy Policy | Missing | Required for app stores |
| Terms of Service | Missing | Required for app stores |
| Unit Tests | None | Should add before production |
| CI/CD Pipeline | None | Consider GitHub Actions |
| Error Tracking | None | Add Sentry or similar |
| Analytics | None | Add Firebase Analytics |

### Known Issues

1. **Keyboard Handling**: Some modal dialogs had keyboard dismissal issues (fixed)
2. **Drag & Drop Removed**: Replaced with Up/Down buttons due to Reanimated errors
3. **Image Loading**: Newly added attractions need `sync-photos` script run

---

## Changelog

Recent implementation history is tracked in `Barnamej_Bahraini/changelog.md`.

## Scripts Reference

### Mobile App

```bash
npm start          # Start Expo development server
npm run android    # Start on Android
npm run ios        # Start on iOS
npm run web        # Start web version
npm run export:attractions  # Export attractions data
```

### Server

```bash
npm start          # Start production server
npm run dev        # Start with nodemon (auto-reload)
npm run sync-photos # Regenerate attractionPhotos.ts from database
```

### Admin Dashboard

```bash
npm run dev        # Start Vite dev server
npm run build      # Production build
npm run preview    # Preview production build
```

---

## File Quick Reference

### Most Important Files

| File | Purpose |
|------|---------|
| `App.tsx` | Mobile app entry point |
| `server/index.js` | Complete backend server |
| `src/services/database.ts` | Data operations (Supabase) |
| `src/db/client.ts` | Supabase client initialization |
| `src/navigation/AppNavigator.tsx` | Navigation structure |
| `docs/database/schema.md` | Supabase PostgreSQL schema |

---

*This documentation was generated on January 12, 2026, based on comprehensive analysis of the Barnamej Bahraini codebase.*
