
-- =============================================
-- MIGRATION 6: Admin RLS Policies (ADDITIVE ONLY)
-- =============================================

-- ---- staff_profiles ----
-- Staff can read all staff profiles
CREATE POLICY "Staff can read staff profiles"
  ON public.staff_profiles FOR SELECT
  TO authenticated
  USING (public.is_staff(auth.uid()));

-- Super admin can manage staff profiles
CREATE POLICY "Super admin manages staff profiles"
  ON public.staff_profiles FOR ALL
  TO authenticated
  USING (public.get_staff_role(auth.uid()) = 'super_admin')
  WITH CHECK (public.get_staff_role(auth.uid()) = 'super_admin');

-- Staff can update own profile (last_login, avatar)
CREATE POLICY "Staff update own profile"
  ON public.staff_profiles FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ---- activity_log ----
-- Staff can read activity log
CREATE POLICY "Staff can read activity log"
  ON public.activity_log FOR SELECT
  TO authenticated
  USING (public.is_staff(auth.uid()));

-- Staff can insert activity log
CREATE POLICY "Staff can insert activity log"
  ON public.activity_log FOR INSERT
  TO authenticated
  WITH CHECK (public.is_staff(auth.uid()));

-- ---- product_images ----
-- Public can read product images
CREATE POLICY "Public read product images"
  ON public.product_images FOR SELECT
  USING (true);

-- Staff can manage product images
CREATE POLICY "Staff manage product images"
  ON public.product_images FOR ALL
  TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

-- ---- Admin policies on existing tables (ADDITIVE) ----

-- Products: staff can insert/update/delete
CREATE POLICY "Staff can insert products"
  ON public.products FOR INSERT
  TO authenticated
  WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "Staff can update products"
  ON public.products FOR UPDATE
  TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "Staff can delete products"
  ON public.products FOR DELETE
  TO authenticated
  USING (public.get_staff_role(auth.uid()) IN ('super_admin', 'admin', 'catalog_manager'));

-- Orders: staff can read all, update
CREATE POLICY "Staff can read all orders"
  ON public.orders FOR SELECT
  TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE POLICY "Staff can update orders"
  ON public.orders FOR UPDATE
  TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "Staff can insert orders"
  ON public.orders FOR INSERT
  TO authenticated
  WITH CHECK (public.is_staff(auth.uid()));

-- Order items: staff can read all, insert, update
CREATE POLICY "Staff can read all order items"
  ON public.order_items FOR SELECT
  TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE POLICY "Staff can insert order items"
  ON public.order_items FOR INSERT
  TO authenticated
  WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "Staff can update order items"
  ON public.order_items FOR UPDATE
  TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

-- Quotes: staff can read all, update, insert
CREATE POLICY "Staff can read all quotes"
  ON public.quotes FOR SELECT
  TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE POLICY "Staff can update quotes"
  ON public.quotes FOR UPDATE
  TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "Staff can insert quotes"
  ON public.quotes FOR INSERT
  TO authenticated
  WITH CHECK (public.is_staff(auth.uid()));

-- Customers: staff can read all, update
CREATE POLICY "Staff can read all customers"
  ON public.customers FOR SELECT
  TO authenticated
  USING (public.is_staff(auth.uid()));

CREATE POLICY "Staff can update customers"
  ON public.customers FOR UPDATE
  TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

-- Customer addresses: staff can read all
CREATE POLICY "Staff can read all addresses"
  ON public.customer_addresses FOR SELECT
  TO authenticated
  USING (public.is_staff(auth.uid()));

-- Banners: staff can manage
CREATE POLICY "Staff can insert banners"
  ON public.banners FOR INSERT
  TO authenticated
  WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "Staff can update banners"
  ON public.banners FOR UPDATE
  TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "Staff can delete banners"
  ON public.banners FOR DELETE
  TO authenticated
  USING (public.get_staff_role(auth.uid()) IN ('super_admin', 'admin'));

-- Categories: staff can manage
CREATE POLICY "Staff can insert categories"
  ON public.categories FOR INSERT
  TO authenticated
  WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "Staff can update categories"
  ON public.categories FOR UPDATE
  TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "Staff can delete categories"
  ON public.categories FOR DELETE
  TO authenticated
  USING (public.get_staff_role(auth.uid()) IN ('super_admin', 'admin', 'catalog_manager'));

-- Brands: staff can manage
CREATE POLICY "Staff can insert brands"
  ON public.brands FOR INSERT
  TO authenticated
  WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "Staff can update brands"
  ON public.brands FOR UPDATE
  TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "Staff can delete brands"
  ON public.brands FOR DELETE
  TO authenticated
  USING (public.get_staff_role(auth.uid()) IN ('super_admin', 'admin', 'catalog_manager'));

-- Pricing tiers: staff can manage
CREATE POLICY "Staff can insert pricing tiers"
  ON public.pricing_tiers FOR INSERT
  TO authenticated
  WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "Staff can update pricing tiers"
  ON public.pricing_tiers FOR UPDATE
  TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "Staff can delete pricing tiers"
  ON public.pricing_tiers FOR DELETE
  TO authenticated
  USING (public.is_staff(auth.uid()));

-- Product groups: staff can manage
CREATE POLICY "Staff can insert product groups"
  ON public.product_groups FOR INSERT
  TO authenticated
  WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "Staff can update product groups"
  ON public.product_groups FOR UPDATE
  TO authenticated
  USING (public.is_staff(auth.uid()))
  WITH CHECK (public.is_staff(auth.uid()));

CREATE POLICY "Staff can delete product groups"
  ON public.product_groups FOR DELETE
  TO authenticated
  USING (public.get_staff_role(auth.uid()) IN ('super_admin', 'admin'));
