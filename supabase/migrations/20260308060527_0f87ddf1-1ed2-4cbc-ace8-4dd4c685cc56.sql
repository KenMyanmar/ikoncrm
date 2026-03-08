
-- Fix search_path on new trigger functions
ALTER FUNCTION public.validate_promotion_type() SET search_path = public;
ALTER FUNCTION public.validate_coupon_type() SET search_path = public;
