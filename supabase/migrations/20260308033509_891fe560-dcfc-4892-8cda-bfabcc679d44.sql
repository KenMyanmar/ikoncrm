
-- =============================================
-- MIGRATION 5: CRM Admin Tables, Columns, Functions
-- =============================================

-- 1. Staff Profiles Table
CREATE TABLE public.staff_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  email text NOT NULL,
  full_name text NOT NULL,
  role text NOT NULL DEFAULT 'viewer' CHECK (role IN ('super_admin', 'admin', 'sales_manager', 'sales_rep', 'catalog_manager', 'viewer')),
  department text,
  avatar_url text,
  is_active boolean NOT NULL DEFAULT true,
  last_login_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_staff_profiles_user_id ON public.staff_profiles(user_id);
CREATE INDEX idx_staff_profiles_role ON public.staff_profiles(role);

-- 2. Activity Log Table
CREATE TABLE public.activity_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid REFERENCES public.staff_profiles(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  entity_name text,
  details jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_activity_log_staff_id ON public.activity_log(staff_id);
CREATE INDEX idx_activity_log_entity ON public.activity_log(entity_type, entity_id);
CREATE INDEX idx_activity_log_created_at ON public.activity_log(created_at DESC);

-- 3. Product Images Table
CREATE TABLE public.product_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  image_url text NOT NULL,
  alt_text text,
  sort_order integer NOT NULL DEFAULT 0,
  is_primary boolean NOT NULL DEFAULT false,
  uploaded_by uuid REFERENCES public.staff_profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_product_images_product_id ON public.product_images(product_id);

-- 4. Add admin columns to products
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS long_description text,
  ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS data_completeness integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_enriched_at timestamptz,
  ADD COLUMN IF NOT EXISTS enriched_by uuid REFERENCES public.staff_profiles(id) ON DELETE SET NULL;

-- 5. Add admin columns to orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES public.staff_profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  ADD COLUMN IF NOT EXISTS source text DEFAULT 'emall';

-- 6. Add admin columns to quotes
ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES public.staff_profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  ADD COLUMN IF NOT EXISTS follow_up_date date,
  ADD COLUMN IF NOT EXISTS admin_internal_notes text;

-- 7. Helper function: get_staff_role
CREATE OR REPLACE FUNCTION public.get_staff_role(_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.staff_profiles
  WHERE user_id = _user_id AND is_active = true
  LIMIT 1;
$$;

-- 8. Helper function: is_staff
CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.staff_profiles
    WHERE user_id = _user_id AND is_active = true
  );
$$;

-- 9. Calculate data completeness function
CREATE OR REPLACE FUNCTION public.calculate_data_completeness(_product_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  score integer := 0;
  max_score integer := 0;
  p record;
  img_count integer;
BEGIN
  SELECT * INTO p FROM public.products WHERE id = _product_id;
  IF NOT FOUND THEN RETURN 0; END IF;

  -- Description (15 pts)
  max_score := max_score + 15;
  IF p.description IS NOT NULL AND length(p.description) > 10 THEN score := score + 15; END IF;

  -- Short description (10 pts)
  max_score := max_score + 10;
  IF p.short_description IS NOT NULL AND length(p.short_description) > 5 THEN score := score + 10; END IF;

  -- Long description (10 pts)
  max_score := max_score + 10;
  IF p.long_description IS NOT NULL AND length(p.long_description) > 20 THEN score := score + 10; END IF;

  -- Selling price (15 pts)
  max_score := max_score + 15;
  IF p.selling_price IS NOT NULL AND p.selling_price > 0 THEN score := score + 15; END IF;

  -- Thumbnail (10 pts)
  max_score := max_score + 10;
  IF p.thumbnail_url IS NOT NULL AND p.thumbnail_url != '' THEN score := score + 10; END IF;

  -- Additional images (10 pts)
  max_score := max_score + 10;
  SELECT count(*) INTO img_count FROM public.product_images WHERE product_id = _product_id;
  IF img_count > 0 THEN score := score + 10; END IF;

  -- Category (10 pts)
  max_score := max_score + 10;
  IF p.category_id IS NOT NULL THEN score := score + 10; END IF;

  -- Brand (10 pts)
  max_score := max_score + 10;
  IF p.brand_id IS NOT NULL THEN score := score + 10; END IF;

  -- Specifications (5 pts)
  max_score := max_score + 5;
  IF p.specifications IS NOT NULL AND p.specifications != '{}'::jsonb THEN score := score + 5; END IF;

  -- Tags (5 pts)
  max_score := max_score + 5;
  IF p.tags IS NOT NULL AND array_length(p.tags, 1) > 0 THEN score := score + 5; END IF;

  IF max_score = 0 THEN RETURN 0; END IF;
  RETURN round((score::numeric / max_score::numeric) * 100)::integer;
END;
$$;

-- 10. Enable RLS on new tables
ALTER TABLE public.staff_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
