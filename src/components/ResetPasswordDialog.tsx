import { useState } from "react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Copy, Check, KeyRound, Mail, Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staffName: string;
  staffEmail: string;
  userId: string;
}

export default function ResetPasswordDialog({ open, onOpenChange, staffName, staffEmail, userId }: Props) {
  const [tab, setTab] = useState("set");
  const [customPassword, setCustomPassword] = useState("");
  const [generatedPassword, setGeneratedPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  const resetState = () => {
    setCustomPassword("");
    setGeneratedPassword(null);
    setCopied(false);
    setLoading(false);
  };

  const handleSetPassword = async (password?: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("manage-staff", {
        body: { action: "reset_password", user_id: userId, password: password || undefined },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setGeneratedPassword(data.password);
      toast.success("Password has been reset");
    } catch (e: any) {
      toast.error(e.message || "Failed to reset password");
    } finally {
      setLoading(false);
    }
  };

  const handleSendResetEmail = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("manage-staff", {
        body: { action: "send_reset_email", email: staffEmail },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success("Password reset email sent to " + staffEmail);
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e.message || "Failed to send reset email");
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = () => {
    if (generatedPassword) {
      navigator.clipboard.writeText(generatedPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) resetState(); onOpenChange(o); }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" />
            Reset Password
          </DialogTitle>
          <DialogDescription>
            Reset password for <span className="font-medium text-foreground">{staffName}</span>
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={setTab} className="mt-2">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="set">Set Password</TabsTrigger>
            <TabsTrigger value="email">Send Reset Email</TabsTrigger>
          </TabsList>

          <TabsContent value="set" className="space-y-4 mt-4">
            {generatedPassword ? (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  New password has been set. Copy it now — it won't be shown again.
                </p>
                <div className="flex items-center gap-2">
                  <Input value={generatedPassword} readOnly className="font-mono text-sm" />
                  <Button size="icon" variant="outline" onClick={copyToClipboard}>
                    {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
                <Button className="w-full" variant="outline" onClick={() => { resetState(); onOpenChange(false); }}>
                  Done
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                <Button
                  className="w-full"
                  onClick={() => handleSetPassword()}
                  disabled={loading}
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Auto-generate Password
                </Button>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">or set custom</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Custom Password</Label>
                  <Input
                    type="text"
                    value={customPassword}
                    onChange={(e) => setCustomPassword(e.target.value)}
                    placeholder="Enter a custom password"
                  />
                </div>
                <Button
                  className="w-full"
                  variant="secondary"
                  onClick={() => handleSetPassword(customPassword)}
                  disabled={loading || customPassword.length < 6}
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Set Custom Password
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="email" className="space-y-4 mt-4">
            <p className="text-sm text-muted-foreground">
              Send a password reset link to <span className="font-medium text-foreground">{staffEmail}</span>.
              The user will set their own password.
            </p>
            <Button className="w-full" onClick={handleSendResetEmail} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Mail className="h-4 w-4 mr-2" />}
              Send Reset Email
            </Button>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
