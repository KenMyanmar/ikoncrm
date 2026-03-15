import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useStaff } from "@/contexts/StaffContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Bell, Check } from "lucide-react";
import { useState } from "react";

export function NotificationBell() {
  const { staff } = useStaff();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const { data: unreadCount } = useQuery({
    queryKey: ["unread-notifications", staff?.id],
    queryFn: async () => {
      const { count } = await (supabase as any)
        .from("staff_notifications")
        .select("*", { count: "exact", head: true })
        .eq("staff_id", staff!.id)
        .eq("is_read", false);
      return count || 0;
    },
    refetchInterval: 15000,
    enabled: !!staff?.id,
  });

  const { data: notifications } = useQuery({
    queryKey: ["recent-notifications", staff?.id],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("staff_notifications")
        .select("*")
        .eq("staff_id", staff!.id)
        .order("created_at", { ascending: false })
        .limit(10);
      return (data || []) as any[];
    },
    enabled: !!staff?.id && open,
  });

  const markReadMutation = useMutation({
    mutationFn: async (notifId: string) => {
      await (supabase as any).from("staff_notifications").update({ is_read: true }).eq("id", notifId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["unread-notifications"] });
      queryClient.invalidateQueries({ queryKey: ["recent-notifications"] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: async () => {
      await (supabase as any).from("staff_notifications").update({ is_read: true }).eq("staff_id", staff!.id).eq("is_read", false);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["unread-notifications"] });
      queryClient.invalidateQueries({ queryKey: ["recent-notifications"] });
    },
  });

  const handleClick = (notif: any) => {
    if (!notif.is_read) markReadMutation.mutate(notif.id);
    if (notif.link) {
      setOpen(false);
      navigate(notif.link);
    }
  };

  const formatTime = (ts: string) => {
    const diff = Date.now() - new Date(ts).getTime();
    const min = Math.floor(diff / 60000);
    if (min < 60) return `${min}m`;
    const hrs = Math.floor(min / 60);
    if (hrs < 24) return `${hrs}h`;
    return `${Math.floor(hrs / 24)}d`;
  };

  if (!staff) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="relative text-sidebar-foreground/50 hover:text-sidebar-foreground" title="Notifications">
          <Bell className="h-4 w-4" />
          {(unreadCount ?? 0) > 0 && (
            <span className="absolute -top-1.5 -right-1.5 bg-destructive text-destructive-foreground text-[8px] font-bold rounded-full h-3.5 min-w-[14px] flex items-center justify-center px-0.5">
              {unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="end" side="top">
        <div className="px-3 py-2 border-b border-border flex items-center justify-between">
          <span className="text-xs font-medium text-foreground">Notifications</span>
          {(unreadCount ?? 0) > 0 && (
            <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2" onClick={() => markAllReadMutation.mutate()}>
              <Check className="h-3 w-3 mr-1" /> Mark all read
            </Button>
          )}
        </div>
        <div className="max-h-60 overflow-y-auto">
          {(notifications || []).length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-4">No notifications</p>
          )}
          {(notifications || []).map((n: any) => (
            <button
              key={n.id}
              className={`w-full text-left px-3 py-2 border-b border-border last:border-0 hover:bg-accent text-xs ${!n.is_read ? "bg-accent/30" : ""}`}
              onClick={() => handleClick(n)}
            >
              <p className="font-medium text-foreground">{n.title}</p>
              {n.body && <p className="text-muted-foreground truncate mt-0.5">{n.body}</p>}
              <p className="text-[10px] text-muted-foreground mt-0.5">{formatTime(n.created_at)}</p>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
