import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type Item = { product_id?: string | null; name?: string; quantity?: number; notes?: string };

export type ProductDetail = {
  id: string;
  stock_code: string | null;
  description: string | null;
  selling_price: number | null;
  currency: string | null;
  thumbnail_url: string | null;
  brand_id: string | null;
  is_active: boolean;
};

export type BrandLite = { id: string; name: string };

export function useQuoteItemDetails(items: Item[] | null | undefined) {
  const productIds = Array.from(
    new Set(
      (items ?? [])
        .map((it) => it?.product_id)
        .filter((v): v is string => typeof v === "string" && v.length > 0)
    )
  );

  const productsQuery = useQuery({
    queryKey: ["quote-item-products", productIds.slice().sort().join(",")],
    enabled: productIds.length > 0,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, stock_code, description, selling_price, currency, thumbnail_url, brand_id, is_active")
        .in("id", productIds);
      if (error) throw error;
      return (data ?? []) as ProductDetail[];
    },
  });

  const brandIds = Array.from(
    new Set((productsQuery.data ?? []).map((p) => p.brand_id).filter((v): v is string => !!v))
  );

  const brandsQuery = useQuery({
    queryKey: ["quote-item-brands", brandIds.slice().sort().join(",")],
    enabled: brandIds.length > 0,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("brands")
        .select("id, name")
        .in("id", brandIds);
      if (error) throw error;
      return (data ?? []) as BrandLite[];
    },
  });

  const productMap = new Map((productsQuery.data ?? []).map((p) => [p.id, p]));
  const brandMap = new Map((brandsQuery.data ?? []).map((b) => [b.id, b.name]));

  return {
    productMap,
    brandMap,
    isLoading: productsQuery.isLoading || brandsQuery.isLoading,
    isError: productsQuery.isError || brandsQuery.isError,
  };
}
