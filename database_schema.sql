-- 1. PROFILES TABLE (Extends Supabase Auth)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  role TEXT DEFAULT 'customer' CHECK (role IN ('customer', 'host', 'admin', 'support')),
  phone TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 2. PROPERTIES TABLE
CREATE TABLE public.properties (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  host_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  location TEXT NOT NULL,
  price NUMERIC NOT NULL CHECK (price > 0),
  images TEXT[] DEFAULT '{}',
  amenities TEXT[] DEFAULT '{}',
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'pending')),
  rating NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- 3. BOOKINGS TABLE
CREATE TABLE public.bookings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID REFERENCES public.properties(id) ON DELETE CASCADE NOT NULL,
  guest_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  total_price NUMERIC NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  CONSTRAINT date_check CHECK (check_out > check_in)
);

-- 4. PAYMENTS TABLE
CREATE TABLE public.payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE NOT NULL,
  amount NUMERIC NOT NULL,
  commission NUMERIC NOT NULL,
  net_amount NUMERIC NOT NULL,
  payment_method TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'refunded')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- ENABLE ROW LEVEL SECURITY
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- RLS POLICIES: PROFILES
CREATE POLICY "Admins can manage all profiles" ON public.profiles FOR ALL TO authenticated USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);
CREATE POLICY "Users can view and edit own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- RLS POLICIES: PROPERTIES
CREATE POLICY "Anyone can view active properties" ON public.properties FOR SELECT USING (status = 'active');
CREATE POLICY "Hosts can manage own properties" ON public.properties FOR ALL TO authenticated USING (
  auth.uid() = host_id OR (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);

-- RLS POLICIES: BOOKINGS
CREATE POLICY "Guests can view own bookings" ON public.bookings FOR SELECT TO authenticated USING (
  auth.uid() = guest_id OR 
  auth.uid() IN (SELECT host_id FROM public.properties WHERE id = property_id) OR
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);
CREATE POLICY "Guests can create bookings" ON public.bookings FOR INSERT TO authenticated WITH CHECK (auth.uid() = guest_id);

-- RLS POLICIES: PAYMENTS
CREATE POLICY "Users can view own payments" ON public.payments FOR SELECT TO authenticated USING (
  auth.uid() IN (SELECT guest_id FROM public.bookings WHERE id = booking_id) OR
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'admin'
);

-- REALTIME ENABLEMENT
ALTER PUBLICATION supabase_realtime ADD TABLE properties, bookings;