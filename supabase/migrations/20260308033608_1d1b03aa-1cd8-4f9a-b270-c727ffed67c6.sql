
-- Create storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('product-images', 'product-images', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('brand-logos', 'brand-logos', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('category-images', 'category-images', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('banners', 'banners', true) ON CONFLICT (id) DO NOTHING;

-- Storage policies: public read
CREATE POLICY "Public read product-images" ON storage.objects FOR SELECT USING (bucket_id = 'product-images');
CREATE POLICY "Public read brand-logos" ON storage.objects FOR SELECT USING (bucket_id = 'brand-logos');
CREATE POLICY "Public read category-images" ON storage.objects FOR SELECT USING (bucket_id = 'category-images');
CREATE POLICY "Public read banners" ON storage.objects FOR SELECT USING (bucket_id = 'banners');

-- Storage policies: staff can upload/update/delete
CREATE POLICY "Staff upload product-images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'product-images' AND public.is_staff(auth.uid()));
CREATE POLICY "Staff update product-images" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'product-images' AND public.is_staff(auth.uid()));
CREATE POLICY "Staff delete product-images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'product-images' AND public.is_staff(auth.uid()));

CREATE POLICY "Staff upload brand-logos" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'brand-logos' AND public.is_staff(auth.uid()));
CREATE POLICY "Staff update brand-logos" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'brand-logos' AND public.is_staff(auth.uid()));
CREATE POLICY "Staff delete brand-logos" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'brand-logos' AND public.is_staff(auth.uid()));

CREATE POLICY "Staff upload category-images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'category-images' AND public.is_staff(auth.uid()));
CREATE POLICY "Staff update category-images" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'category-images' AND public.is_staff(auth.uid()));
CREATE POLICY "Staff delete category-images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'category-images' AND public.is_staff(auth.uid()));

CREATE POLICY "Staff upload banners" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'banners' AND public.is_staff(auth.uid()));
CREATE POLICY "Staff update banners" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'banners' AND public.is_staff(auth.uid()));
CREATE POLICY "Staff delete banners" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'banners' AND public.is_staff(auth.uid()));
