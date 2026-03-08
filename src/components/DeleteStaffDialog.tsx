import { useState } from "react";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Trash2, Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staffName: string;
  staffId: string;
  userId: string;
  onDeleted: () => void;
}

export default function DeleteStaffDialog({ open, onOpenChange, staffName, staffId, userId, onDeleted }: Props) {
  const [confirmation, setConfirmation] = useState("");
  const [loading, setLoading] = useState(false);

  const canDelete = confirmation === staffName;

  const handleDelete = async () => {
    if (!canDelete) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("manage-staff", {
        body: { action: "delete", user_id: userId, staff_id: staffId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("Account permanently deleted");
      onDeleted();
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || "Failed to delete account");
    } finally {
      setLoading(false);
      setConfirmation("");
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={(o) => { if (!o) setConfirmation(""); onOpenChange(o); }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-5 w-5" />
            Delete Staff Account
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-3">
            <p>
              This will <strong>permanently delete</strong> the account for{" "}
              <span className="font-semibold text-foreground">{staffName}</span>, including their
              auth credentials and profile. This action cannot be undone.
            </p>
            <div className="space-y-2 pt-2">
              <Label className="text-foreground">
                Type <span className="font-mono font-bold">{staffName}</span> to confirm
              </Label>
              <Input
                value={confirmation}
                onChange={(e) => setConfirmation(e.target.value)}
                placeholder={staffName}
                className="font-mono"
              />
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={!canDelete || loading}
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            Delete Permanently
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
