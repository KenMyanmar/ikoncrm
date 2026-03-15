
-- Add unique constraint for upsert support
ALTER TABLE kpi_snapshots ADD CONSTRAINT kpi_snapshots_date_period_unique UNIQUE (snapshot_date, period);

-- Create take_kpi_snapshot function
CREATE OR REPLACE FUNCTION public.take_kpi_snapshot(p_period text DEFAULT 'daily')
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_date date := CURRENT_DATE;
  v_start date;
  v_metrics jsonb;
BEGIN
  IF p_period = 'daily' THEN v_start := v_date;
  ELSIF p_period = 'weekly' THEN v_start := date_trunc('week', v_date)::date;
  ELSIF p_period = 'monthly' THEN v_start := date_trunc('month', v_date)::date;
  END IF;

  SELECT jsonb_build_object(
    'total_orders', (SELECT COUNT(*) FROM orders WHERE created_at::date >= v_start AND created_at::date <= v_date),
    'delivered_orders', (SELECT COUNT(*) FROM orders WHERE delivered_at::date >= v_start AND delivered_at::date <= v_date),
    'cancelled_orders', (SELECT COUNT(*) FROM orders WHERE status = 'cancelled' AND created_at::date >= v_start AND created_at::date <= v_date),
    'gross_revenue', (SELECT COALESCE(SUM(total), 0) FROM orders WHERE created_at::date >= v_start AND created_at::date <= v_date AND status NOT IN ('cancelled', 'expired')),
    'net_revenue', (
      SELECT COALESCE(SUM(total), 0) FROM orders WHERE status = 'delivered' AND delivered_at::date >= v_start AND delivered_at::date <= v_date
    ) - (
      SELECT COALESCE(SUM(amount), 0) FROM order_refunds WHERE status = 'processed' AND processed_at::date >= v_start AND processed_at::date <= v_date
    ),
    'avg_order_value', (SELECT COALESCE(AVG(total), 0) FROM orders WHERE created_at::date >= v_start AND created_at::date <= v_date AND status NOT IN ('cancelled', 'expired')),
    'new_customers', (SELECT COUNT(*) FROM customers WHERE created_at::date >= v_start AND created_at::date <= v_date),
    'sla_breach_count', (SELECT COUNT(*) FROM sla_tracking WHERE is_breached = true AND entered_at::date >= v_start AND entered_at::date <= v_date),
    'cancellation_rate', (
      SELECT ROUND(COALESCE(
        COUNT(CASE WHEN status = 'cancelled' THEN 1 END)::numeric / NULLIF(COUNT(*), 0), 0
      ), 4) FROM orders WHERE created_at::date >= v_start AND created_at::date <= v_date
    ),
    'checkout_to_paid_rate', (
      SELECT ROUND(COALESCE(
        COUNT(CASE WHEN status IN ('paid', 'packed', 'out_for_delivery', 'delivered') THEN 1 END)::numeric /
        NULLIF(COUNT(CASE WHEN status != 'draft' THEN 1 END), 0), 0
      ), 4) FROM orders WHERE created_at::date >= v_start AND created_at::date <= v_date
    ),
    'delivery_success_rate', (
      SELECT ROUND(COALESCE(
        COUNT(CASE WHEN status = 'delivered' THEN 1 END)::numeric / NULLIF(COUNT(*), 0), 0
      ), 4) FROM delivery_assignments WHERE assigned_at::date >= v_start AND assigned_at::date <= v_date
    ),
    'avg_verification_minutes', (
      SELECT ROUND(COALESCE(AVG(EXTRACT(EPOCH FROM (resolved_at - entered_at)) / 60), 0))
      FROM sla_tracking WHERE queue = 'payment' AND resolved_at IS NOT NULL AND entered_at::date >= v_start AND entered_at::date <= v_date
    )
  ) INTO v_metrics;

  INSERT INTO kpi_snapshots (snapshot_date, period, metrics)
  VALUES (v_date, p_period, v_metrics)
  ON CONFLICT (snapshot_date, period) DO UPDATE SET metrics = EXCLUDED.metrics;
END;
$$;

GRANT EXECUTE ON FUNCTION public.take_kpi_snapshot TO authenticated;
