import { supabase } from "@/integrations/supabase/client";

export type PriceSource = "flash_deal" | "promotion" | "catalog";

export interface EffectivePrice {
  price: number;
  source: PriceSource;
}

/**
 * Resolve the effective unit price for a product, applying (in order):
 *   1. Active flash deal (with stock available)
 *   2. Highest-priority active promotion (percentage / fixed_amount)
 *   3. Catalog selling price
 *
 * Mirrors the server-side logic in the create_manual_order RPC (Migration 27).
 */
export async function getEffectivePrice(
  productId: string,
  categoryId: string | null,
  sellingPrice: number,
): Promise<EffectivePrice> {
  const nowIso = new Date().toISOString();

  // 1. Flash deal
  const { data: deal } = await supabase
    .from("flash_deals")
    .select("flash_price, stock_limit, sold_count")
    .eq("product_id", productId)
    .eq("is_active", true)
    .lte("start_time", nowIso)
    .gte("end_time", nowIso)
    .order("end_time", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (
    deal &&
    (deal.stock_limit === null || (deal.sold_count ?? 0) < deal.stock_limit)
  ) {
    return { price: Number(deal.flash_price), source: "flash_deal" };
  }

  // 2. Promotion — match all / this product / this category
  const orParts = [`applies_to.eq.all`, `and(applies_to.eq.product,target_ids.cs.{${productId}})`];
  if (categoryId) {
    orParts.push(`and(applies_to.eq.category,target_ids.cs.{${categoryId}})`);
  }

  const { data: promo } = await supabase
    .from("promotions")
    .select("type, discount_value, max_discount_amount")
    .eq("is_active", true)
    .lte("start_date", nowIso)
    .gte("end_date", nowIso)
    .or(orParts.join(","))
    .order("priority", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (promo) {
    if (promo.type === "percentage") {
      let discount = sellingPrice * (Number(promo.discount_value) / 100);
      if (promo.max_discount_amount != null) {
        discount = Math.min(discount, Number(promo.max_discount_amount));
      }
      return { price: Math.max(sellingPrice - discount, 0), source: "promotion" };
    }
    if (promo.type === "fixed_amount") {
      return {
        price: Math.max(sellingPrice - Number(promo.discount_value), 0),
        source: "promotion",
      };
    }
  }

  return { price: sellingPrice, source: "catalog" };
}