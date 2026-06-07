import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle, Loader2, Mail } from "lucide-react";
import brandLogo from "@/assets/brand-logo-placeholder.svg";
import { BRAND } from "@/config/brand";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast.error(error.message);
    } else {
      navigate("/");
    }
    setLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setResetLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      setResetSent(true);
    }
  };

  const switchToForgot = () => {
    setResetEmail(email);
    setResetSent(false);
    setShowForgotPassword(true);
  };

  const switchToLogin = () => {
    setShowForgotPassword(false);
    setResetSent(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-primary p-4">
      <Card className="w-full max-w-md border-0 shadow-2xl">
        <CardHeader className="text-center pb-2 pt-8">
          <div className="mx-auto mb-4">
            <img src={brandLogo} alt={BRAND.name} className="h-16 w-auto mx-auto" />
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">{BRAND.name.toUpperCase()}</h1>
          <p className="text-xs font-semibold tracking-[0.3em] text-accent uppercase">CRM Admin</p>
        </CardHeader>
        <CardContent className="px-8 pb-8 pt-4">
          {!showForgotPassword ? (
            <>
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={switchToForgot}
                    className="text-sm text-accent hover:underline"
                  >
                    Forgot Password?
                  </button>
                </div>
                <Button type="submit" className="w-full bg-accent text-accent-foreground hover:bg-accent/90" disabled={loading}>
                  {loading ? "Signing in…" : "Sign In"}
                </Button>
              </form>
              <p className="text-xs text-center text-muted-foreground mt-6">Staff access only. Contact your administrator for credentials.</p>
            </>
          ) : (
            <>
              {!resetSent ? (
                <form onSubmit={handleForgotPassword} className="space-y-5">
                  <div className="flex flex-col items-center gap-2 mb-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10">
                      <Mail className="h-5 w-5 text-accent" />
                    </div>
                    <h2 className="text-lg font-semibold text-foreground">Reset Your Password</h2>
                    <p className="text-xs text-muted-foreground text-center">Enter your email address and we'll send you a reset link.</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reset-email">Email</Label>
                    <Input
                      id="reset-email"
                      type="email"
                      value={resetEmail}
                      onChange={e => setResetEmail(e.target.value)}
                      placeholder="you@company.com"
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full bg-accent text-accent-foreground hover:bg-accent/90" disabled={resetLoading}>
                    {resetLoading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Sending…
                      </>
                    ) : (
                      "Send Reset Link"
                    )}
                  </Button>
                  <button
                    type="button"
                    onClick={switchToLogin}
                    className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mx-auto"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Back to Login
                  </button>
                </form>
              ) : (
                <div className="flex flex-col items-center gap-4 py-6 text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100">
                    <CheckCircle className="h-7 w-7 text-green-600" />
                  </div>
                  <h2 className="text-lg font-semibold text-foreground">Check Your Email</h2>
                  <p className="text-sm text-muted-foreground">
                    We've sent a reset link to <strong className="text-foreground">{resetEmail}</strong>. Click the link in the email to set a new password.
                  </p>
                  <button
                    type="button"
                    onClick={switchToLogin}
                    className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mt-2"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Back to Login
                  </button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
