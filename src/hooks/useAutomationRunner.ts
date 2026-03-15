import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useStaff } from "@/contexts/StaffContext";
import { logActivity } from "@/lib/activity";
import { resolveTemplate } from "@/components/orders/templateUtils";

export function useAutomationRunner() {
  const { staff } = useStaff();
  const runningRef = useRef(false);

  useEffect(() => {
    const role = staff?.role;
    if (!staff || !role || !["manager", "admin", "super_admin"].includes(role)) return;

    const run = async () => {
      if (runningRef.current) return;
      runningRef.current = true;
      try {
        await executeTimeBasedRules(staff.id);
      } catch (e) {
        console.error("[AutomationRunner]", e);
      } finally {
        runningRef.current = false;
      }
    };

    run();
    const interval = setInterval(run, 60_000);
    return () => clearInterval(interval);
  }, [staff?.id, staff?.role]);
}

async function executeTimeBasedRules(staffId: string) {
  const { data: rules } = await supabase
    .from("automation_rules")
    .select("*")
    .eq("is_active", true)
    .eq("trigger_type", "time_based");

  if (!rules || rules.length === 0) return;

  for (const rule of rules) {
    const cfg = rule.trigger_config as Record<string, any>;
    const status = cfg.status;
    const delayMinutes = cfg.delay_minutes || 0;
    if (!status || !delayMinutes) continue;

    const cutoff = new Date(Date.now() - delayMinutes * 60_000).toISOString();

    const { data: orders } = await supabase
      .from("orders")
      .select("id, order_number, customer_id, total, payment_method, customers(id, name, email)")
      .eq("status", status)
      .lt("created_at", cutoff)
      .limit(50);

    if (!orders || orders.length === 0) continue;

    for (const order of orders) {
      // Dedup: check if this rule+order already executed
      const dedupKey = `automation_${rule.id}_${order.id}`;
      const { count } = await supabase
        .from("activity_log")
        .select("*", { count: "exact", head: true })
        .eq("entity_id", order.id)
        .eq("action", dedupKey);

      if ((count || 0) > 0) continue;

      // Check conditions
      const conditions = (rule.conditions || {}) as Record<string, any>;
      if (conditions.cod_only && order.payment_method !== "cod") continue;
      if (conditions.min_total && (order.total || 0) < conditions.min_total) continue;

      // Execute action
      const actionCfg = rule.action_config as Record<string, any>;
      const customer = order.customers as any;

      try {
        switch (rule.action_type) {
          case "send_communication": {
            if (customer?.id) {
              const vars = {
                customer_name: customer.name || "Customer",
                order_number: order.order_number,
                total: String(order.total || 0),
              };
              const body = resolveTemplate(actionCfg.template_key || "Reminder for {{order_number}}", vars);
              await supabase.from("customer_communications").insert({
                customer_id: customer.id,
                order_id: order.id,
                channel: "email",
                direction: "outbound",
                subject: `Reminder: ${order.order_number}`,
                body,
                template_key: actionCfg.template_key || null,
                sent_by: staffId,
                status: "sent",
              });
            }
            break;
          }
          case "update_status": {
            const targetStatus = actionCfg.target_status;
            if (targetStatus) {
              await supabase.from("orders").update({
                status: targetStatus,
                updated_at: new Date().toISOString(),
              }).eq("id", order.id);
              await supabase.from("order_status_history").insert({
                order_id: order.id,
                from_status: status,
                to_status: targetStatus,
                changed_by_role: "automation",
                reason: `Auto: ${rule.name}`,
              });
            }
            break;
          }
          case "create_notification": {
            const notifyRole = actionCfg.notify_role || "manager";
            const { data: targets } = await supabase
              .from("staff_profiles")
              .select("id")
              .eq("role", notifyRole)
              .eq("is_active", true);

            const title = resolveTemplate(actionCfg.title || "Automation alert: {{order_number}}", {
              order_number: order.order_number,
            });

            if (targets) {
              for (const t of targets) {
                await (supabase as any).from("staff_notifications").insert({
                  staff_id: t.id,
                  type: "automation",
                  title,
                  body: `Rule: ${rule.name}`,
                  link: `/orders/${order.id}`,
                  priority: actionCfg.priority || "normal",
                });
              }
            }
            break;
          }
          case "create_task": {
            await supabase.from("crm_tasks").insert({
              title: resolveTemplate(actionCfg.title || "Task for {{order_number}}", {
                order_number: order.order_number,
              }),
              description: `Auto-created by rule: ${rule.name}`,
              queue: actionCfg.queue || "crm",
              priority: actionCfg.priority || "normal",
              order_id: order.id,
              customer_id: customer?.id || null,
              automation_rule_id: rule.id,
              status: "open",
            });
            break;
          }
          case "flag_order": {
            await supabase.from("orders").update({
              requires_approval: true,
              updated_at: new Date().toISOString(),
            }).eq("id", order.id);
            break;
          }
        }

        // Log dedup marker
        await logActivity(staffId, dedupKey, "order", order.id, order.order_number, {
          rule_name: rule.name,
          action_type: rule.action_type,
        });

        // Update rule stats
        await supabase.from("automation_rules").update({
          last_run_at: new Date().toISOString(),
          run_count: (rule.run_count || 0) + 1,
        }).eq("id", rule.id);

      } catch (err) {
        console.error(`[AutomationRunner] Failed rule=${rule.name} order=${order.order_number}`, err);
      }
    }
  }
}
