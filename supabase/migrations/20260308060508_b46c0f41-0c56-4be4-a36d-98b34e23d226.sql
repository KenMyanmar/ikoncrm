
-- =============================================
-- MARKETING HUB: promotions, flash_deals, coupons, coupon_usage
-- =============================================

-- 1. PROMOTIONS TABLE
CREATE TABLE IF NOT EXISTS public.promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  type text NOT NULL DEFAULT 'percentage',
  discount_value decimal,
  buy_quantity integer,
  get_quantity integer,
  min_order_amount decimal DEFAULT 0,
  max_discount_amount decimal,
  applies_to text NOT NULL DEFAULT 'all',
  target_ids uuid[] DEFAULT '{}',
  start_date timestamptz NOT NULL,
  end_date timestamptz NOT NULL,
  is_active boolean DEFAULT true,
  priority integer DEFAULT 0,
  usage_limit integer,
  usage_count integer DEFAULT 0,
  banner_image_url text,
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.promotions ENABLE ROW LEVEL SECURITY;

-- Staff full CRUD
CREATE POLICY "staff_manage_promotions" ON public.promotions FOR ALL
  TO authenticated
  USING (is_staff(auth.uid()))
  WITH CHECK (is_staff(auth.uid()));

-- Public read active promotions (E-Mall)
CREATE POLICY "public_read_active_promotions" ON public.promotions FOR SELECT
  TO anon, authenticated
  USING (is_active = true AND now() BETWEEN start_date AND end_date);

-- Validation trigger for type
CREATE OR REPLACE FUNCTION public.validate_promotion_type()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.type NOT IN ('percentage', 'fixed_amount', 'buy_x_get_y', 'bundle') THEN
    RAISE EXCEPTION 'Invalid promotion type: %', NEW.type;
  END IF;
  IF NEW.applies_to NOT IN ('all', 'category', 'brand', 'product') THEN
    RAISE EXCEPTION 'Invalid applies_to value: %', NEW.applies_to;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_promotion
  BEFORE INSERT OR UPDATE ON public.promotions
  FOR EACH ROW EXECUTE FUNCTION public.validate_promotion_type();

-- 2. FLASH DEALS TABLE
CREATE TABLE IF NOT EXISTS public.flash_deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  title text,
  original_price decimal NOT NULL,
  flash_price decimal NOT NULL,
  discount_percentage decimal GENERATED ALWAYS AS (
    ROUND(((original_price - flash_price) / NULLIF(original_price, 0)) * 100, 1)
  ) STORED,
  stock_limit integer NOT NULL DEFAULT 100,
  sold_count integer DEFAULT 0,
  start_time timestamptz NOT NULL,
  end_time timestamptz NOT NULL,
  is_active boolean DEFAULT true,
  badge_text text DEFAULT 'Flash Deal',
  sort_order integer DEFAULT 0,
  created_by uuid,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.flash_deals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_manage_flash_deals" ON public.flash_deals FOR ALL
  TO authenticated
  USING (is_staff(auth.uid()))
  WITH CHECK (is_staff(auth.uid()));

CREATE POLICY "public_read_active_flash_deals" ON public.flash_deals FOR SELECT
  TO anon, authenticated
  USING (is_active = true AND now() BETWEEN start_time AND end_time AND sold_count < stock_limit);

-- 3. COUPONS TABLE
CREATE TABLE IF NOT EXISTS public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  title text NOT NULL,
  description text,
  type text NOT NULL DEFAULT 'percentage',
  discount_value decimal NOT NULL,
  min_order_amount decimal DEFAULT 0,
  max_discount_amount decimal,
  max_uses integer,
  used_count integer DEFAULT 0,
  max_uses_per_user integer DEFAULT 1,
  applies_to text DEFAULT 'all',
  target_ids uuid[] DEFAULT '{}',
  start_date timestamptz NOT NULL,
  end_date timestamptz NOT NULL,
  is_active boolean DEFAULT true,
  created_by uuid,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff_manage_coupons" ON public.coupons FOR ALL
  TO authenticated
  USING (is_staff(auth.uid()))
  WITH CHECK (is_staff(auth.uid()));

CREATE POLICY "public_read_active_coupons" ON public.coupons FOR SELECT
  TO anon, authenticated
  USING (is_active = true AND now() BETWEEN start_date AND end_date);

-- Validation trigger for coupon type
CREATE OR REPLACE FUNCTION public.validate_coupon_type()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.type NOT IN ('percentage', 'fixed_amount', 'free_shipping') THEN
    RAISE EXCEPTION 'Invalid coupon type: %', NEW.type;
  END IF;
  IF NEW.applies_to NOT IN ('all', 'category', 'brand', 'product') THEN
    RAISE EXCEPTION 'Invalid applies_to value: %', NEW.applies_to;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_validate_coupon
  BEFORE INSERT OR UPDATE ON public.coupons
  FOR EACH ROW EXECUTE FUNCTION public.validate_coupon_type();

-- 4. COUPON USAGE TABLE
CREATE TABLE IF NOT EXISTS public.coupon_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coupon_id uuid REFERENCES public.coupons(id) ON DELETE CASCADE NOT NULL,
  user_id uuid NOT NULL,
  order_id uuid REFERENCES public.orders(id),
  used_at timestamptz DEFAULT now(),
  UNIQUE(coupon_id, user_id, order_id)
);

ALTER TABLE public.coupon_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_own_coupon_usage" ON public.coupon_usage FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "staff_manage_coupon_usage" ON public.coupon_usage FOR ALL
  TO authenticated
  USING (is_staff(auth.uid()))
  WITH CHECK (is_staff(auth.uid()));
