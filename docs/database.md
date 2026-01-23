
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