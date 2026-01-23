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

---

## Project Overview

**Barnamej Bahraini** ("Bahrain's Program" in Arabic) is a full-stack tourism application designed to help users explore Bahrain's attractions, create personalized itineraries, and share reviews. The project aligns with Bahrain's Economic Vision 2030, focusing on sustainability, competitiveness, and fairness in tourism.

### Key Features

- 📍 **Attraction Discovery**: Browse, search, and filter tourist attractions
- 🗺️ **Itinerary Planning**: Create, manage, and share trip itineraries
- ⭐ **Reviews System**: Multi-criteria rating system (Price, Cleanliness, Service, Experience)
- 🔄 **Offline Support**: Local SQLite database with background sync
- 🖥️ **Admin Dashboard**: Web-based management interface

### Tech Stack

| Component | Technology |
|-----------|------------|
| Mobile App | React Native (Expo SDK 54), TypeScript |
| Backend Server | Express.js 5, better-sqlite3 |
| Admin Dashboard | React (Vite), TypeScript |
| Local Database | expo-sqlite (SQLite) |
| Server Database | SQLite via better-sqlite3 |
| Navigation | React Navigation 7 |

---

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

## Backend Documentation

### Server Architecture

The backend is a single-file Express.js server (`server/index.js`) running on port 3000.

#### Key Components

| Component | Purpose |
|-----------|---------|
| CORS Middleware | Cross-origin request handling |
| body-parser | JSON request body parsing |
| Static Files | Serves `/public` and `/assets` directories |
| better-sqlite3 | Synchronous SQLite database driver |

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
```javascript
// Individual review rating is average of 4 criteria
const reviewRating = (price_rating + cleanliness_rating + 
                      service_rating + experience_rating) / 4;

// Attraction rating is average of all review ratings
const avgRating = reviews.reduce((acc, r) => 
  acc + (r.price_rating + r.cleanliness_rating + 
         r.service_rating + r.experience_rating) / 4, 0) / reviews.length;
```

#### Itinerary Price Recalculation
When attractions are added/removed from itineraries, total_price is automatically recalculated:
```javascript
const result = db.prepare(`
  SELECT SUM(a.price) as total 
  FROM itinerary_attractions ia 
  JOIN attractions a ON ia.attraction_id = a.id 
  WHERE ia.itinerary_id = ?
`).get(itineraryId);
```

---

## Mobile App Documentation

### Frontend Architecture

The mobile app follows a modular architecture with clear separation of concerns:

| Layer | Location | Purpose |
|-------|----------|---------|
| Screens | `src/screens/` | Page-level components |
| Components | `src/components/` | Reusable UI elements |
| Services | `src/services/` | Business logic & data access |
| DB Layer | `src/db/` | SQLite client, migrations, sync |
| Navigation | `src/navigation/` | Routing configuration |

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

**Data Source**: `getFeaturedAttractions()`, `getItineraries()` from local SQLite

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

### Database Layer (`src/db/`)

#### `client.ts` - Database Client
**Purpose**: Singleton SQLite connection manager with preloaded database support

**Key Features**:
- Lazy initialization with `getDB()`
- Copies bundled database from assets on first run
- Corruption detection and auto-recovery
- WAL mode enabled for performance
- Development mode flag for optional DB reset

```typescript
export const getDB = async () => DatabaseClient.getInstance().getDB();
```

#### `migrator.ts` - Migration System
**Purpose**: Schema versioning with checksum validation

**Current Migrations**:
1. `0001_init` - Base tables
2. `0002_add_search_index` - Search optimization
3. `0003_fix_itinerary_table` - Schema corrections
4. `0004_add_sorting` - Sort order support

**Features**:
- Tracks executed migrations in `migrations` table
- Checksum validation to detect modified migrations
- Version tracking in `schema_meta` table

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
**Purpose**: High-level data operations using local SQLite

**Key Functions**:

| Function | Purpose |
|----------|---------|
| `initDatabase()` | Initialize DB and start sync service |
| `getAllAttractions()` | Fetch all attractions |
| `getFeaturedAttractions()` | Top 5 by rating |
| `getAttractionById(id)` | Single attraction |
| `addReview(review)` | Save locally + queue for sync |
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

### Tables

```sql
-- Core attractions table
attractions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  location TEXT,
  image TEXT,
  rating REAL DEFAULT 0,
  price REAL DEFAULT 0
)

-- Multiple photos per attraction
attraction_photos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  attraction_id INTEGER NOT NULL,
  url TEXT NOT NULL,
  is_primary INTEGER DEFAULT 0,
  display_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (attraction_id) REFERENCES attractions(id) ON DELETE CASCADE
)

-- Multi-criteria reviews
reviews (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  attraction_id INTEGER,
  name TEXT,
  price_rating INTEGER,
  cleanliness_rating INTEGER,
  service_rating INTEGER,
  experience_rating INTEGER,
  comment TEXT,
  rating REAL DEFAULT 0,
  age INTEGER,
  nationality_id INTEGER,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (attraction_id) REFERENCES attractions(id)
)

-- User itineraries
itineraries (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  is_public INTEGER DEFAULT 0,
  is_auto_sort_enabled INTEGER DEFAULT 0,
  creator_name TEXT,
  total_price REAL DEFAULT 0,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
)

-- Junction table for itinerary-attractions
itinerary_attractions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  itinerary_id INTEGER,
  attraction_id INTEGER,
  start_time TEXT,
  end_time TEXT,
  price REAL DEFAULT 0,
  notes TEXT,
  sort_order INTEGER DEFAULT 0,
  FOREIGN KEY (itinerary_id) REFERENCES itineraries(id),
  FOREIGN KEY (attraction_id) REFERENCES attractions(id)
)

-- Offline sync queue (mobile only)
sync_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT,
  payload TEXT,
  status TEXT DEFAULT 'pending',
  retry_count INTEGER DEFAULT 0,
  priority INTEGER DEFAULT 1,
  last_error TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
)

-- Migration tracking
migrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  checksum TEXT,
  executed_at TEXT DEFAULT CURRENT_TIMESTAMP
)

-- Schema version tracking
schema_meta (
  version INTEGER
)
```

### Entity Relationships

```
attractions (1) ─────< (N) attraction_photos
attractions (1) ─────< (N) reviews
attractions (N) >────< (N) itineraries [via itinerary_attractions]
```

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
cd server
npm install
```

#### 3. Install Admin Dashboard Dependencies

```bash
cd ../admin-dashboard
npm install
```

#### 4. Configure API URL (Important!)

Edit `src/services/api.ts` and update the IP address:

```typescript
const API_BASE_URL = __DEV__
  ? 'http://YOUR_LOCAL_IP:3000'  // ← Replace with your machine's IP
  : 'https://api.yourapp.com';
```

**Find your IP**:
- Windows: Run `ipconfig` in CMD
- Mac/Linux: Run `ifconfig` or `ip addr`

#### 5. Start the Backend Server

```bash
cd server
npm run dev    # Development with auto-reload
# or
npm start      # Production mode
```

Server runs at `http://localhost:3000`

#### 6. Start the Mobile App

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

#### 7. Start Admin Dashboard (Optional)

```bash
cd admin-dashboard
npm run dev
```

Dashboard runs at `http://localhost:5173`

### Running All Services

**Recommended Terminal Setup**:
```
Terminal 1 (Server):     cd server && npm run dev
Terminal 2 (Mobile):     npm start
Terminal 3 (Dashboard):  cd admin-dashboard && npm run dev
```

---

## Configuration & Environment

### Required Configuration

| Location | Setting | Description |
|----------|---------|-------------|
| `src/services/api.ts` | `API_BASE_URL` | Backend server URL |
| `server/index.js` | `PORT` | Server port (default: 3000) |
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
    "plugins": ["expo-font", "expo-sqlite", "expo-asset"]
  }
}
```

### Database Location

- **Server**: `assets/database/Barnamej.db`
- **Mobile (Runtime)**: `${documentDirectory}/SQLite/barnamej_v2.db`

### Development Flags

In `src/db/client.ts`:
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
3. **Offline-First Design**: Local database with background sync
4. **Migration System**: Versioned schema changes with checksums
5. **Consistent Styling**: Cohesive red (#D71A28) brand color
6. **Error Handling**: Try-catch blocks with user-friendly alerts

### Areas for Improvement

1. **Backend Single File**: `server/index.js` is 530+ lines; consider splitting into routes/controllers
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
| SQL Prepared Statements | ✅ Used | LOW | Good practice |
| CORS Wide Open | Server | MEDIUM | Restrict origins |
| No Rate Limiting | Server | MEDIUM | Add express-rate-limit |
| Hardcoded IP | `api.ts` | LOW | Use env variables |

### SQL Injection Protection

The project uses prepared statements which is good:
```javascript
db.prepare('SELECT * FROM attractions WHERE id = ?').get(req.params.id);
```

### Recommended Security Additions

1. **Authentication**: JWT tokens for admin endpoints
2. **Input Validation**: Use `express-validator` for request validation
3. **CORS Configuration**: Restrict to known origins
4. **Rate Limiting**: Prevent abuse
5. **Environment Variables**: Move sensitive config to `.env`

---

## Performance & Scalability

### Current Optimizations

1. **SQLite WAL Mode**: Enabled for better concurrent access
2. **Preloaded Database**: Ships with bundled data
3. **Lazy Loading**: DB initialized only when needed
4. **Batch Sync**: Queue processes items in batches
5. **Optimistic Updates**: UI updates before server response

### Bottlenecks

1. **Single Server DB File**: Not suitable for high concurrency
2. **No Caching**: Every request hits the database
3. **Sync on Every Network Change**: Could be rate-limited
4. **No Pagination**: All attractions loaded at once

### Scaling Recommendations

| Improvement | Effort | Impact |
|-------------|--------|--------|
| Add Redis caching | Medium | High |
| Implement pagination | Low | Medium |
| Move to PostgreSQL | High | High |
| Add CDN for images | Medium | High |
| Throttle sync service | Low | Low |

---

## Assumptions & Missing Information

### Assumptions Made

1. **No Production Deployment**: Project appears to be in development
2. **Single Developer**: Codebase optimized for solo development
3. **Demo Data**: Attractions are pre-seeded Bahraini landmarks
4. **No User Accounts**: All data is public or device-local
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
| `src/services/database.ts` | Local data operations |
| `src/db/client.ts` | SQLite connection manager |
| `src/navigation/AppNavigator.tsx` | Navigation structure |
| `assets/database/Barnamej.db` | Preloaded database |

---

*This documentation was generated on January 12, 2026, based on comprehensive analysis of the Barnamej Bahraini codebase.*
