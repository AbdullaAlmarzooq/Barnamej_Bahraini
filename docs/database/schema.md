# Database Schema — Barnamej Bahraini

This document defines the PostgreSQL database schema used in Supabase.
It is the single source of truth for the backend data structure of:

- Mobile App (Expo)
- Admin Dashboard (React)
- Supabase Backend

The schema follows production best practices including:
- UUID primary keys
- Soft deletes
- Row Level Security (RLS)
- Audit timestamps
- Optimized indexing

-- ============================================================================
-- Barnamej Bahraini - PostgreSQL Schema for Supabase
-- Production-Ready Database Design
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- ENUMS
-- ============================================================================

CREATE TYPE attraction_category AS ENUM (
  'historical',
  'landmark',
  'nature',
  'religious',
  'museum',
  'cultural',
  'entertainment',
  'shopping',
  'dining'
);

CREATE TYPE review_status AS ENUM (
  'pending',
  'approved',
  'rejected',
  'flagged'
);

-- ============================================================================
-- REFERENCE TABLES
-- ============================================================================

-- Nationalities reference table
CREATE TABLE nationalities (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name varchar(100) NOT NULL UNIQUE,
  code varchar(3) UNIQUE, -- ISO 3166-1 alpha-3 code
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_nationalities_active ON nationalities(is_active) WHERE is_active = true;

-- ============================================================================
-- CORE TABLES
-- ============================================================================

-- Attractions table
CREATE TABLE attractions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  name varchar(255) NOT NULL,
  slug varchar(255), -- For SEO-friendly URLs (uniqueness enforced by partial index)
  description text,
  category attraction_category NOT NULL,
  location varchar(255),
  latitude decimal(10, 8), -- GPS coordinates
  longitude decimal(11, 8),
  price decimal(10, 2) DEFAULT 0 CHECK (price >= 0),
  estimated_duration_minutes integer CHECK (estimated_duration_minutes IS NULL OR estimated_duration_minutes > 0), -- How long to visit
  
  -- Computed/cached fields
  avg_rating decimal(3, 2) DEFAULT 0 CHECK (avg_rating >= 0 AND avg_rating <= 5),
  total_reviews integer DEFAULT 0,
  
  -- Metadata
  metadata jsonb DEFAULT '{}', -- Flexible field for additional data
  
  -- Status flags
  is_featured boolean DEFAULT false,
  is_active boolean DEFAULT true,
  
  -- Audit fields
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

-- Indexes for attractions
CREATE INDEX idx_attractions_category ON attractions(category) WHERE deleted_at IS NULL;
CREATE INDEX idx_attractions_featured ON attractions(is_featured) WHERE is_featured = true AND deleted_at IS NULL;
CREATE INDEX idx_attractions_rating ON attractions(avg_rating DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_attractions_location ON attractions(location) WHERE deleted_at IS NULL;
CREATE INDEX idx_attractions_coords ON attractions(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- Ensure slug uniqueness (partial index excludes soft-deleted rows)
CREATE UNIQUE INDEX idx_attractions_slug_unique ON attractions(slug) WHERE deleted_at IS NULL;

-- Full-text search index
CREATE INDEX idx_attractions_search ON attractions 
  USING gin(to_tsvector('english', coalesce(name, '') || ' ' || coalesce(description, '') || ' ' || coalesce(location, '')))
  WHERE deleted_at IS NULL;

-- ============================================================================
-- PHOTOS TABLE
-- ============================================================================

CREATE TABLE attraction_photos (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  attraction_id uuid NOT NULL REFERENCES attractions(id) ON DELETE CASCADE,
  
  -- Supabase Storage integration
  storage_path varchar(500) NOT NULL, -- Path in Supabase Storage bucket
  storage_bucket varchar(100) DEFAULT 'attraction-images',
  
  -- Photo metadata
  caption text,
  alt_text varchar(255), -- For accessibility
  width integer,
  height integer,
  file_size_bytes integer,
  mime_type varchar(50),
  
  -- Ordering and status
  display_order integer DEFAULT 0,
  is_primary boolean DEFAULT false,
  is_active boolean DEFAULT true,
  
  -- Audit fields
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX idx_photos_attraction ON attraction_photos(attraction_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_photos_order ON attraction_photos(attraction_id, display_order) WHERE deleted_at IS NULL;

-- Ensure only ONE primary photo per attraction (safer than UNIQUE constraint with NULLs)
CREATE UNIQUE INDEX unique_primary_photo_per_attraction
  ON attraction_photos(attraction_id)
  WHERE is_primary = true AND deleted_at IS NULL;

-- ============================================================================
-- REVIEWS TABLE
-- ============================================================================

CREATE TABLE reviews (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  attraction_id uuid NOT NULL REFERENCES attractions(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  
  -- Review content
  reviewer_name varchar(100), -- Optional if user prefers anonymity
  comment text,
  
  -- Multi-criteria ratings (1-5) - ALL REQUIRED
  price_rating smallint NOT NULL CHECK (price_rating BETWEEN 1 AND 5),
  cleanliness_rating smallint NOT NULL CHECK (cleanliness_rating BETWEEN 1 AND 5),
  service_rating smallint NOT NULL CHECK (service_rating BETWEEN 1 AND 5),
  experience_rating smallint NOT NULL CHECK (experience_rating BETWEEN 1 AND 5),
  
  -- Computed overall rating
  overall_rating decimal(3, 2) GENERATED ALWAYS AS (
    (price_rating + cleanliness_rating + service_rating + experience_rating) / 4.0
  ) STORED,
  
  -- Reviewer demographics
  age smallint CHECK (age IS NULL OR (age >= 1 AND age <= 120)),
  nationality_id uuid REFERENCES nationalities(id) ON DELETE SET NULL,
  
  -- Moderation
  status review_status DEFAULT 'pending',
  moderation_notes text,
  moderated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  moderated_at timestamptz,
  
  -- Helpful votes (for future feature)
  helpful_count integer DEFAULT 0,
  
  -- Audit fields
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz,
  
  -- Prevent duplicate reviews from same user
  CONSTRAINT unique_user_attraction_review UNIQUE (user_id, attraction_id) 
    WHERE deleted_at IS NULL AND user_id IS NOT NULL
);

CREATE INDEX idx_reviews_attraction ON reviews(attraction_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_reviews_user ON reviews(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_reviews_status ON reviews(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_reviews_rating ON reviews(overall_rating DESC) WHERE deleted_at IS NULL;
CREATE INDEX idx_reviews_created ON reviews(created_at DESC) WHERE deleted_at IS NULL;

-- Performance index for attraction rating calculation trigger
CREATE INDEX idx_reviews_approved_for_rating ON reviews(attraction_id, overall_rating)
  WHERE status = 'approved' AND deleted_at IS NULL;

-- ============================================================================
-- ITINERARIES TABLE
-- ============================================================================

CREATE TABLE itineraries (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Itinerary details
  name varchar(255) NOT NULL,
  description text,
  
  -- Sharing settings
  is_public boolean DEFAULT false,
  is_featured boolean DEFAULT false, -- Admin can feature community itineraries
  
  -- Sorting preference
  auto_sort_enabled boolean DEFAULT false,
  
  -- Cached/computed fields
  total_price decimal(10, 2) DEFAULT 0,
  total_attractions integer DEFAULT 0,
  estimated_duration_minutes integer DEFAULT 0,
  
  -- Trip dates (optional)
  start_date date,
  end_date date,
  
  -- Metadata
  metadata jsonb DEFAULT '{}',
  
  -- Status
  is_active boolean DEFAULT true,
  
  -- Audit fields
  creator_name varchar(100), -- For anonymous/guest creators
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz,
  
  CHECK (start_date IS NULL OR end_date IS NULL OR end_date >= start_date)
);

CREATE INDEX idx_itineraries_user ON itineraries(user_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_itineraries_public ON itineraries(is_public) WHERE is_public = true AND deleted_at IS NULL;
CREATE INDEX idx_itineraries_featured ON itineraries(is_featured) WHERE is_featured = true AND deleted_at IS NULL;
CREATE INDEX idx_itineraries_dates ON itineraries(start_date, end_date) WHERE deleted_at IS NULL;

-- ============================================================================
-- ITINERARY ATTRACTIONS (Junction Table)
-- ============================================================================

CREATE TABLE itinerary_attractions (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  itinerary_id uuid NOT NULL REFERENCES itineraries(id) ON DELETE CASCADE,
  attraction_id uuid NOT NULL REFERENCES attractions(id) ON DELETE CASCADE,
  
  -- Scheduling
  scheduled_start_time timestamptz, -- When planning to visit
  scheduled_end_time timestamptz,
  
  -- Custom pricing (can override attraction default)
  custom_price decimal(10, 2) CHECK (custom_price IS NULL OR custom_price >= 0),
  
  -- User notes
  notes text,
  
  -- Manual ordering (critical for UX)
  position integer NOT NULL, -- Sequential position in itinerary
  
  -- Audit fields
  added_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz,
  
  -- Prevent duplicate attractions in same itinerary
  CONSTRAINT unique_itinerary_attraction UNIQUE (itinerary_id, attraction_id) 
    WHERE deleted_at IS NULL,
  
  CHECK (scheduled_end_time IS NULL OR scheduled_start_time IS NULL OR scheduled_end_time > scheduled_start_time)
);

CREATE INDEX idx_itinerary_attractions_itinerary ON itinerary_attractions(itinerary_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_itinerary_attractions_position ON itinerary_attractions(itinerary_id, position) WHERE deleted_at IS NULL;
CREATE INDEX idx_itinerary_attractions_schedule ON itinerary_attractions(scheduled_start_time) WHERE deleted_at IS NULL;

-- Ensure unique positions within each itinerary (prevents duplicate ordering)
CREATE UNIQUE INDEX unique_itinerary_position
  ON itinerary_attractions(itinerary_id, position)
  WHERE deleted_at IS NULL;

-- ============================================================================
-- AUDIT/SYNC TABLES (For offline-first mobile app)
-- ============================================================================

CREATE TABLE sync_log (
  id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  device_id varchar(255),
  
  -- Sync operation details
  operation_type varchar(50) NOT NULL, -- 'push', 'pull', 'conflict'
  table_name varchar(100),
  record_id uuid,
  
  -- Sync status
  status varchar(50) DEFAULT 'pending', -- 'pending', 'completed', 'failed'
  error_message text,
  retry_count integer DEFAULT 0,
  
  -- Payload (for debugging)
  payload jsonb,
  
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_sync_log_user ON sync_log(user_id);
CREATE INDEX idx_sync_log_status ON sync_log(status) WHERE status = 'pending';
CREATE INDEX idx_sync_log_created ON sync_log(created_at DESC);

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to all relevant tables
CREATE TRIGGER update_attractions_updated_at BEFORE UPDATE ON attractions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_attraction_photos_updated_at BEFORE UPDATE ON attraction_photos
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reviews_updated_at BEFORE UPDATE ON reviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_itineraries_updated_at BEFORE UPDATE ON itineraries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_itinerary_attractions_updated_at BEFORE UPDATE ON itinerary_attractions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_nationalities_updated_at BEFORE UPDATE ON nationalities
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update attraction rating when reviews change
CREATE OR REPLACE FUNCTION update_attraction_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE attractions
  SET 
    avg_rating = (
      SELECT COALESCE(AVG(overall_rating), 0)
      FROM reviews
      WHERE attraction_id = COALESCE(NEW.attraction_id, OLD.attraction_id)
        AND deleted_at IS NULL
        AND status = 'approved'
    ),
    total_reviews = (
      SELECT COUNT(*)
      FROM reviews
      WHERE attraction_id = COALESCE(NEW.attraction_id, OLD.attraction_id)
        AND deleted_at IS NULL
        AND status = 'approved'
    ),
    updated_at = now()
  WHERE id = COALESCE(NEW.attraction_id, OLD.attraction_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_attraction_rating_on_review
  AFTER INSERT OR UPDATE OR DELETE ON reviews
  FOR EACH ROW EXECUTE FUNCTION update_attraction_rating();

-- Function to update itinerary totals when attractions change
CREATE OR REPLACE FUNCTION update_itinerary_totals()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE itineraries
  SET 
    total_price = (
      SELECT COALESCE(SUM(COALESCE(ia.custom_price, a.price)), 0)
      FROM itinerary_attractions ia
      JOIN attractions a ON ia.attraction_id = a.id
      WHERE ia.itinerary_id = COALESCE(NEW.itinerary_id, OLD.itinerary_id)
        AND ia.deleted_at IS NULL
    ),
    total_attractions = (
      SELECT COUNT(*)
      FROM itinerary_attractions
      WHERE itinerary_id = COALESCE(NEW.itinerary_id, OLD.itinerary_id)
        AND deleted_at IS NULL
    ),
    estimated_duration_minutes = (
      SELECT COALESCE(SUM(a.estimated_duration_minutes), 0)
      FROM itinerary_attractions ia
      JOIN attractions a ON ia.attraction_id = a.id
      WHERE ia.itinerary_id = COALESCE(NEW.itinerary_id, OLD.itinerary_id)
        AND ia.deleted_at IS NULL
    ),
    updated_at = now()
  WHERE id = COALESCE(NEW.itinerary_id, OLD.itinerary_id);
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_itinerary_totals_on_change
  AFTER INSERT OR UPDATE OR DELETE ON itinerary_attractions
  FOR EACH ROW EXECUTE FUNCTION update_itinerary_totals();

-- Function to auto-generate slug from name
CREATE OR REPLACE FUNCTION generate_slug_from_name()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.slug IS NULL OR NEW.slug = '' THEN
    NEW.slug = lower(regexp_replace(NEW.name, '[^a-zA-Z0-9]+', '-', 'g'));
    NEW.slug = trim(both '-' from NEW.slug);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER generate_attraction_slug BEFORE INSERT OR UPDATE ON attractions
  FOR EACH ROW EXECUTE FUNCTION generate_slug_from_name();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE attractions ENABLE ROW LEVEL SECURITY;
ALTER TABLE attraction_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE itineraries ENABLE ROW LEVEL SECURITY;
ALTER TABLE itinerary_attractions ENABLE ROW LEVEL SECURITY;
ALTER TABLE nationalities ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_log ENABLE ROW LEVEL SECURITY;

-- Attractions: Public read, admin write
CREATE POLICY "Attractions are viewable by everyone" ON attractions
  FOR SELECT USING (deleted_at IS NULL AND is_active = true);

CREATE POLICY "Admins can manage attractions" ON attractions
  FOR ALL USING (
    auth.jwt() ->> 'role' = 'admin'
  );

-- Photos: Public read, admin write
CREATE POLICY "Photos are viewable by everyone" ON attraction_photos
  FOR SELECT USING (deleted_at IS NULL AND is_active = true);

CREATE POLICY "Admins can manage photos" ON attraction_photos
  FOR ALL USING (
    auth.jwt() ->> 'role' = 'admin'
  );

-- Reviews: Public read approved, users can write their own, guests can submit anonymously
CREATE POLICY "Approved reviews are viewable by everyone" ON reviews
  FOR SELECT USING (deleted_at IS NULL AND status = 'approved');

CREATE POLICY "Authenticated users can create reviews" ON reviews
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Guests can create anonymous reviews" ON reviews
  FOR INSERT WITH CHECK (user_id IS NULL);

CREATE POLICY "Users can update their own reviews" ON reviews
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Admins can moderate reviews" ON reviews
  FOR ALL USING (
    auth.jwt() ->> 'role' = 'admin'
  );

-- Itineraries: Public read public ones, users manage their own
CREATE POLICY "Public itineraries are viewable by everyone" ON itineraries
  FOR SELECT USING (
    (deleted_at IS NULL AND is_public = true) OR
    auth.uid() = user_id
  );

CREATE POLICY "Users can create itineraries" ON itineraries
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own itineraries" ON itineraries
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own itineraries" ON itineraries
  FOR DELETE USING (auth.uid() = user_id);

-- Itinerary attractions: Same as parent itinerary
CREATE POLICY "Itinerary attractions viewable with parent" ON itinerary_attractions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM itineraries i
      WHERE i.id = itinerary_id
        AND ((i.deleted_at IS NULL AND i.is_public = true) OR auth.uid() = i.user_id)
    )
  );

CREATE POLICY "Users can manage their itinerary attractions" ON itinerary_attractions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM itineraries i
      WHERE i.id = itinerary_id AND auth.uid() = i.user_id
    )
  );

-- Nationalities: Public read, admin write
CREATE POLICY "Nationalities are viewable by everyone" ON nationalities
  FOR SELECT USING (is_active = true);

CREATE POLICY "Admins can manage nationalities" ON nationalities
  FOR ALL USING (
    auth.jwt() ->> 'role' = 'admin'
  );

-- Sync Log: Users can only access their own sync records
CREATE POLICY "Users can view their own sync log" ON sync_log
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sync records" ON sync_log
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all sync logs" ON sync_log
  FOR SELECT USING (
    auth.jwt() ->> 'role' = 'admin'
  );

-- ============================================================================
-- SEED DATA
-- ============================================================================

-- Insert common nationalities
INSERT INTO nationalities (name, code) VALUES
  ('Bahraini', 'BHR'),
  ('Saudi Arabian', 'SAU'),
  ('Emirati', 'ARE'),
  ('Kuwaiti', 'KWT'),
  ('Omani', 'OMN'),
  ('Qatari', 'QAT'),
  ('American', 'USA'),
  ('British', 'GBR'),
  ('Indian', 'IND'),
  ('Pakistani', 'PAK'),
  ('Filipino', 'PHL'),
  ('Other', NULL);

-- ============================================================================
-- USEFUL VIEWS
-- ============================================================================

-- View for attraction with primary photo
CREATE VIEW attractions_with_photo AS
SELECT 
  a.*,
  p.storage_path as primary_photo_path,
  p.storage_bucket as primary_photo_bucket
FROM attractions a
LEFT JOIN attraction_photos p ON a.id = p.attraction_id 
  AND p.is_primary = true 
  AND p.deleted_at IS NULL
WHERE a.deleted_at IS NULL;

-- View for itineraries with details
CREATE VIEW itineraries_detailed AS
SELECT 
  i.*,
  u.email as creator_email,
  COUNT(ia.id) as attraction_count
FROM itineraries i
LEFT JOIN auth.users u ON i.user_id = u.id
LEFT JOIN itinerary_attractions ia ON i.id = ia.itinerary_id 
  AND ia.deleted_at IS NULL
WHERE i.deleted_at IS NULL
GROUP BY i.id, u.email;

-- ============================================================================
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Composite indexes for common queries
CREATE INDEX idx_reviews_attraction_status ON reviews(attraction_id, status) 
  WHERE deleted_at IS NULL;

CREATE INDEX idx_itinerary_attractions_composite ON itinerary_attractions(itinerary_id, position, deleted_at);

-- ============================================================================
-- COMMENTS (Documentation)
-- ============================================================================

COMMENT ON TABLE attractions IS 'Tourist attractions in Bahrain';
COMMENT ON TABLE attraction_photos IS 'Photos stored in Supabase Storage, metadata here';
COMMENT ON TABLE reviews IS 'Multi-criteria user reviews with moderation support';
COMMENT ON TABLE itineraries IS 'User-created trip itineraries';
COMMENT ON TABLE itinerary_attractions IS 'Junction table with ordering support for manual and auto-sort';
COMMENT ON TABLE sync_log IS 'Offline-first sync tracking for mobile app';

COMMENT ON COLUMN itinerary_attractions.position IS 'Integer position for manual ordering. Lower numbers appear first.';
COMMENT ON COLUMN itinerary_attractions.scheduled_start_time IS 'Used for auto-sort mode when enabled';
COMMENT ON COLUMN attraction_photos.storage_path IS 'Path to image in Supabase Storage bucket';
COMMENT ON COLUMN reviews.overall_rating IS 'Computed as average of 4 criteria ratings';