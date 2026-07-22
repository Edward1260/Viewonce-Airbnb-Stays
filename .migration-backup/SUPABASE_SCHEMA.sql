-- Phase 3: Supabase Database Schema
-- Execute in Supabase Dashboard SQL Editor: https://wgbtjymimomfmplilkfl.supabase.co
-- WARNING: This will create tables - backup if needed!

-- 1. Enable RLS on auth.users (if not already)
ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

-- 2. Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'host', 'customer')) DEFAULT 'customer',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- RLS for profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can manage all profiles" ON public.profiles
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 3. Buildings table (Multi-unit support)
CREATE TABLE IF NOT EXISTS public.buildings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  host_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  location TEXT NOT NULL,
  latitude DECIMAL(10,8),
  longitude DECIMAL(11,8),
  address TEXT,
  compound_images TEXT[] DEFAULT '{}',
  amenities JSONB DEFAULT '[]'::JSONB,
  house_rules TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'inactive', 'archived')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3.1 Units table (Individual rental units)
CREATE TABLE IF NOT EXISTS public.units (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  building_id UUID NOT NULL REFERENCES public.buildings(id) ON DELETE CASCADE,
  unit_number TEXT NOT NULL,
  floor_number INTEGER,
  bedrooms INTEGER DEFAULT 1 CHECK (bedrooms >= 0),
  bathrooms DECIMAL(3,1) DEFAULT 1.0 CHECK (bathrooms > 0),
  furnishing JSONB DEFAULT '{}'::JSONB,  -- {kitchen: true, wifi: true, ac: true}
  base_price DECIMAL(10,2) NOT NULL,
  deposit DECIMAL(10,2) DEFAULT 0,
  discounts JSONB DEFAULT '{}'::JSONB,  -- {weekend: 0.9, monthly: 0.8}
  images TEXT[] DEFAULT '{}',
  max_guests INTEGER DEFAULT 2 CHECK (max_guests >= 1),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'inactive', 'maintenance')),
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3.2 Unit Availability (calendar)
CREATE TABLE IF NOT EXISTS public.unit_availability (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  unit_id UUID NOT NULL REFERENCES public.units(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('available', 'booked', 'blocked', 'maintenance')),
  price_override DECIMAL(10,2),  -- Dynamic pricing
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(unit_id, date)
);

-- BACKWARD COMPATIBILITY: Keep listings as VIEW for existing code
CREATE OR REPLACE VIEW public.listings AS
SELECT 
  u.id,
  b.host_id,
  b.name || ' - Unit ' || u.unit_number AS title,
  COALESCE(u.description, b.description) AS description,
  u.base_price AS price,
  NULL::DATE AS checkin_date,
  NULL::DATE AS checkout_date,
  u.images AS images,
  u.status AS status,
  b.created_at,
  u.updated_at
FROM public.units u
JOIN public.buildings b ON u.building_id = b.id
WHERE u.status = 'active';

-- RLS for NEW TABLES

-- Buildings RLS
ALTER TABLE public.buildings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public can view active buildings" ON public.buildings
  FOR SELECT USING (status = 'active');
CREATE POLICY "Hosts manage own buildings" ON public.buildings
  FOR ALL USING (host_id = auth.uid());
CREATE POLICY "Admins manage all buildings" ON public.buildings
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Units RLS  
ALTER TABLE public.units ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public view active units" ON public.units
  FOR SELECT USING (status = 'active');
CREATE POLICY "Hosts manage units in own buildings" ON public.units
  FOR ALL USING (
    building_id IN (
      SELECT id FROM public.buildings WHERE host_id = auth.uid()
    )
  );
CREATE POLICY "Admins manage all units" ON public.units
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Unit Availability RLS
ALTER TABLE public.unit_availability ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Hosts view availability for own units" ON public.unit_availability
  FOR SELECT USING (
    unit_id IN (
      SELECT id FROM public.units 
      WHERE building_id IN (
        SELECT id FROM public.buildings WHERE host_id = auth.uid()
      )
    )
  );
CREATE POLICY "Hosts manage availability for own units" ON public.unit_availability
  FOR INSERT, UPDATE, DELETE USING (
    unit_id IN (
      SELECT id FROM public.units 
      WHERE building_id IN (
        SELECT id FROM public.buildings WHERE host_id = auth.uid()
      )
    )
  );

-- Listings VIEW inherits from units (no separate RLS needed)
ALTER VIEW public.listings ENABLE ROW LEVEL SECURITY;

-- 4. Bookings table
CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  checkin DATE NOT NULL,
  checkout DATE NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  total_price DECIMAL(10,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- RLS for bookings
CREATE POLICY "Users can view own bookings" ON public.bookings
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can manage own bookings" ON public.bookings
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Hosts can view/manage bookings for own listings" ON public.bookings
  FOR ALL USING (
    listing_id IN (
      SELECT id FROM public.listings WHERE host_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage all bookings" ON public.bookings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 5. Indexes for performance (UPDATED)
CREATE INDEX idx_buildings_host_id ON public.buildings(host_id);
CREATE INDEX idx_buildings_status ON public.buildings(status);
CREATE INDEX idx_buildings_location ON public.buildings(location) WHERE status = 'active';
CREATE INDEX idx_units_building_id ON public.units(building_id);
CREATE INDEX idx_units_status ON public.units(status);
CREATE INDEX idx_units_price ON public.units(base_price) WHERE status = 'active';
CREATE INDEX idx_unit_availability_unit_date ON public.unit_availability(unit_id, date);
CREATE INDEX idx_unit_availability_status ON public.unit_availability(status);

-- Keep existing indexes
CREATE INDEX idx_listings_host_id ON public.listings(host_id);
CREATE INDEX idx_listings_status ON public.listings(status);
CREATE INDEX idx_bookings_listing_id ON public.bookings(listing_id);
CREATE INDEX idx_bookings_user_id ON public.bookings(user_id);
CREATE INDEX idx_bookings_status ON public.bookings(status);
CREATE INDEX idx_bookings_dates ON public.bookings(checkin, checkout);

-- 6. UPDATED Double-booking prevention RPC (Units)
CREATE OR REPLACE FUNCTION check_unit_availability(
  p_unit_id UUID,
  p_checkin DATE,
  p_checkout DATE
)
RETURNS TABLE(is_available BOOLEAN, conflicting_bookings INTEGER) 
LANGUAGE sql 
SECURITY DEFINER 
AS $$
  SELECT 
    NOT EXISTS (
      SELECT 1 FROM public.bookings b
      JOIN public.units u ON b.listing_id = u.id  -- VIEW compatibility
      WHERE u.id = p_unit_id 
        AND b.status != 'cancelled'
        AND (
          (b.checkin <= p_checkout AND b.checkout >= p_checkin)
        )
    ) AS is_available,
    
    (SELECT COUNT(*) FROM public.bookings b
     JOIN public.units u ON b.listing_id = u.id
     WHERE u.id = p_unit_id 
       AND b.status != 'cancelled'
       AND (
         (b.checkin <= p_checkout AND b.checkout >= p_checkin)
       )
    ) AS conflicting_bookings;
$$;

-- NEW: Bulk unit availability check
CREATE OR REPLACE FUNCTION check_bulk_unit_availability(
  p_unit_ids UUID[],
  p_checkin DATE,
  p_checkout DATE
)
RETURNS TABLE(unit_id UUID, is_available BOOLEAN) 
LANGUAGE sql 
SECURITY DEFINER 
AS $$
  SELECT 
    u.id AS unit_id,
    NOT EXISTS (
      SELECT 1 FROM public.bookings b
      WHERE b.listing_id = u.id 
        AND b.status != 'cancelled'
        AND (
          (b.checkin <= p_checkout AND b.checkout >= p_checkin)
        )
    ) AS is_available
  FROM unnest(p_unit_ids) AS u(id);
$$;

-- 7. Trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_listings_updated_at BEFORE UPDATE ON public.listings FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();
CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON public.bookings FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- 7. MIGRATION: Convert existing listings to buildings/units (Run ONCE)
-- ⚠️ BACKUP FIRST! Comment out after running
/*
INSERT INTO public.buildings (host_id, name, description, location, status)
SELECT host_id, title, description, 'Migrated Location', status 
FROM public.listings;

INSERT INTO public.units (building_id, unit_number, base_price, images, status, description)
SELECT 
  b.id, 
  'Unit 1', 
  listings.price, 
  listings.images, 
  listings.status,
  listings.description
FROM public.listings 
JOIN public.buildings b ON listings.host_id = b.host_id 
  AND listings.title ILIKE '%' || b.name || '%'
ORDER BY listings.created_at;
*/

-- Verify setup (UPDATED)
SELECT 'Multi-unit Schema created successfully' as status;
SELECT 'Profiles: ' || count(*) as profile_count FROM public.profiles;
SELECT 'Buildings: ' || count(*) as building_count FROM public.buildings;
SELECT 'Units: ' || count(*) as unit_count FROM public.units; 
SELECT 'Unit Availability: ' || count(*) as availability_count FROM public.unit_availability;
SELECT 'Listings VIEW: ' || count(*) as listing_view_count FROM public.listings;
SELECT 'Bookings: ' || count(*) as booking_count FROM public.bookings;
