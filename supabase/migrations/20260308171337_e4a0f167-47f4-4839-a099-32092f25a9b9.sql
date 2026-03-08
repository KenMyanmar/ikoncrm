
DO $$
BEGIN
  -- Banners bucket
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Staff manage banners storage' AND tablename = 'objects') THEN
    CREATE POLICY "Staff manage banners storage" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'banners');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Staff delete banners storage' AND tablename = 'objects') THEN
    CREATE POLICY "Staff delete banners storage" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'banners');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public view banners storage' AND tablename = 'objects') THEN
    CREATE POLICY "Public view banners storage" ON storage.objects FOR SELECT TO public USING (bucket_id = 'banners');
  END IF;

  -- Product-images bucket
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Staff upload product-images' AND tablename = 'objects') THEN
    CREATE POLICY "Staff upload product-images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'product-images');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Staff manage product-images' AND tablename = 'objects') THEN
    CREATE POLICY "Staff manage product-images" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'product-images');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Staff delete product-images' AND tablename = 'objects') THEN
    CREATE POLICY "Staff delete product-images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'product-images');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public view product-images' AND tablename = 'objects') THEN
    CREATE POLICY "Public view product-images" ON storage.objects FOR SELECT TO public USING (bucket_id = 'product-images');
  END IF;
END $$;
