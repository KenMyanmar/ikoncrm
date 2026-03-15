import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useStaff } from "@/contexts/StaffContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { Pin, PinOff, Send, MessageSquare } from "lucide-react";

interface OrderNotesProps {
  orderId: string;
}

export function OrderNotes({ orderId }: OrderNotesProps) {
  const { staff } = useStaff();
  const queryClient = useQueryClient();
  const [noteText, setNoteText] = useState("");
  const [showMentions, setShowMentions] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [selectedMentions, setSelectedMentions] = useState<{ id: string; name: string }[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Fetch notes
  const { data: notes } = useQuery({
    queryKey: ["order-notes", orderId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from("order_notes")
        .select("*, staff:author_id(id, full_name, avatar_url)")
        .eq("order_id", orderId)
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false });
      return (data || []) as any[];
    },
  });

  // Fetch active staff for mentions
  const { data: staffList } = useQuery({
    queryKey: ["active-staff"],
    queryFn: async () => {
      const { data } = await supabase.from("staff_profiles").select("id, full_name").eq("is_active", true);
      return data || [];
    },
  });

  const filteredStaff = staffList?.filter(s =>
    s.full_name.toLowerCase().includes(mentionQuery.toLowerCase()) && s.id !== staff?.id
  ) || [];

  // Handle @ detection
  const handleNoteChange = (value: string) => {
    setNoteText(value);
    const cursorPos = textareaRef.current?.selectionStart || 0;
    const textBefore = value.substring(0, cursorPos);
    const atMatch = textBefore.match(/@(\w*)$/);
    if (atMatch) {
      setMentionQuery(atMatch[1]);
      setShowMentions(true);
    } else {
      setShowMentions(false);
    }
  };

  const insertMention = (staffMember: { id: string; full_name: string }) => {
    const cursorPos = textareaRef.current?.selectionStart || 0;
    const textBefore = noteText.substring(0, cursorPos);
    const textAfter = noteText.substring(cursorPos);
    const replaced = textBefore.replace(/@\w*$/, `@${staffMember.full_name} `);
    setNoteText(replaced + textAfter);
    setSelectedMentions(prev => [...prev, { id: staffMember.id, name: staffMember.full_name }]);
    setShowMentions(false);
  };

  // Submit note
  const submitMutation = useMutation({
    mutationFn: async () => {
      if (!noteText.trim() || !staff) return;
      // Extract mention IDs from text
      const mentionIds = selectedMentions.map(m => m.id);

      const { error } = await (supabase as any).from("order_notes").insert({
        order_id: orderId,
        author_id: staff.id,
        content: noteText.trim(),
        mentions: mentionIds,
      });
      if (error) throw error;

      // Create notifications for mentioned staff
      if (mentionIds.length > 0) {
        const { data: order } = await supabase.from("orders").select("order_number").eq("id", orderId).single();
        const notifications = mentionIds.map(mid => ({
          staff_id: mid,
          type: "mention",
          title: `@You in order ${order?.order_number || ""}`,
          body: noteText.trim().substring(0, 100),
          link: `/orders/${orderId}`,
        }));
        await (supabase as any).from("staff_notifications").insert(notifications);
      }
    },
    onSuccess: () => {
      setNoteText("");
      setSelectedMentions([]);
      queryClient.invalidateQueries({ queryKey: ["order-notes", orderId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Pin/unpin
  const pinMutation = useMutation({
    mutationFn: async ({ noteId, isPinned }: { noteId: string; isPinned: boolean }) => {
      const { error } = await (supabase as any).from("order_notes").update({ is_pinned: !isPinned }).eq("id", noteId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["order-notes", orderId] }),
  });

  const formatTime = (ts: string) => {
    const diff = Date.now() - new Date(ts).getTime();
    const min = Math.floor(diff / 60000);
    if (min < 60) return `${min}m ago`;
    const hrs = Math.floor(min / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  const highlightMentions = (text: string) => {
    return text.replace(/@(\w[\w\s]*?\w)(?=\s|$)/g, '<span class="text-primary font-medium">@$1</span>');
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <MessageSquare className="h-4 w-4" /> Team Notes
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Notes list */}
        <div className="space-y-3 max-h-64 overflow-y-auto">
          {(notes || []).map((note: any) => (
            <div key={note.id} className={`text-sm border-b border-border pb-2 last:border-0 ${note.is_pinned ? "bg-accent/30 p-2 rounded-md" : ""}`}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  {note.is_pinned && <Pin className="h-3 w-3 text-primary" />}
                  <Avatar className="h-5 w-5">
                    <AvatarFallback className="text-[8px] bg-muted">
                      {(note.staff?.full_name || "?").split(" ").map((n: string) => n[0]).join("").toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="font-medium text-xs text-foreground">{note.staff?.full_name || "Unknown"}</span>
                  <span className="text-[10px] text-muted-foreground">{formatTime(note.created_at)}</span>
                </div>
                {(note.author_id === staff?.id || ["admin", "super_admin"].includes(staff?.role || "")) && (
                  <Button variant="ghost" size="sm" className="h-5 w-5 p-0" onClick={() => pinMutation.mutate({ noteId: note.id, isPinned: note.is_pinned })}>
                    {note.is_pinned ? <PinOff className="h-3 w-3" /> : <Pin className="h-3 w-3" />}
                  </Button>
                )}
              </div>
              <p className="text-xs text-foreground/80 whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: highlightMentions(note.content) }} />
            </div>
          ))}
          {(!notes || notes.length === 0) && (
            <p className="text-xs text-muted-foreground text-center py-2">No notes yet</p>
          )}
        </div>

        {/* Input */}
        <div className="relative">
          <Textarea
            ref={textareaRef}
            placeholder="Type a note... use @ to mention staff"
            value={noteText}
            onChange={(e) => handleNoteChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                submitMutation.mutate();
              }
            }}
            rows={2}
            className="text-xs pr-10"
          />
          <Button
            size="sm"
            variant="ghost"
            className="absolute right-1 bottom-1 h-7 w-7 p-0"
            onClick={() => submitMutation.mutate()}
            disabled={!noteText.trim() || submitMutation.isPending}
          >
            <Send className="h-3.5 w-3.5" />
          </Button>

          {/* Mention dropdown */}
          {showMentions && filteredStaff.length > 0 && (
            <div className="absolute bottom-full mb-1 left-0 w-full bg-popover border border-border rounded-md shadow-lg max-h-32 overflow-y-auto z-50">
              {filteredStaff.slice(0, 5).map(s => (
                <button
                  key={s.id}
                  className="w-full text-left px-3 py-1.5 hover:bg-accent text-xs"
                  onClick={() => insertMention(s)}
                >
                  {s.full_name}
                </button>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
