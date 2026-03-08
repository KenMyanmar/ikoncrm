import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function generatePassword(length = 16): string {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&*";
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => chars[b % chars.length]).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify caller is super_admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callerId = claimsData.claims.sub;

    // Check caller role
    const { data: callerProfile } = await anonClient
      .from("staff_profiles")
      .select("role")
      .eq("user_id", callerId)
      .eq("is_active", true)
      .single();

    if (!callerProfile || callerProfile.role !== "super_admin") {
      return new Response(JSON.stringify({ error: "Forbidden: super_admin only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Admin client for privileged operations
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const { action, user_id, staff_id, password, email } = body;

    if (!action) {
      return new Response(JSON.stringify({ error: "Missing action" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let result: Record<string, unknown> = {};

    switch (action) {
      case "reset_password": {
        if (!user_id) throw new Error("Missing user_id");
        const newPassword = password || generatePassword();
        const { error } = await adminClient.auth.admin.updateUserById(user_id, {
          password: newPassword,
        });
        if (error) throw error;
        result = { success: true, password: newPassword, generated: !password };
        break;
      }

      case "send_reset_email": {
        if (!email) throw new Error("Missing email");
        const { error } = await adminClient.auth.resetPasswordForEmail(email, {
          redirectTo: "https://ikoncrm.lovable.app/reset-password",
        });
        if (error) throw error;
        result = { success: true, message: "Password reset email sent" };
        break;
      }

      case "force_signout": {
        if (!user_id) throw new Error("Missing user_id");
        // Ban for 0 seconds effectively invalidates all sessions
        const { error: banErr } = await adminClient.auth.admin.updateUserById(user_id, {
          ban_duration: "1s",
        });
        if (banErr) throw banErr;
        // Immediately unban so user can log back in
        const { error: unbanErr } = await adminClient.auth.admin.updateUserById(user_id, {
          ban_duration: "none",
        });
        if (unbanErr) throw unbanErr;
        result = { success: true, message: "User signed out from all devices" };
        break;
      }

      case "suspend": {
        if (!user_id || !staff_id) throw new Error("Missing user_id or staff_id");
        // Ban the auth user permanently
        const { error: banErr } = await adminClient.auth.admin.updateUserById(user_id, {
          ban_duration: "876000h", // ~100 years
        });
        if (banErr) throw banErr;
        // Update staff profile
        const { error: updateErr } = await adminClient
          .from("staff_profiles")
          .update({ is_active: false })
          .eq("id", staff_id);
        if (updateErr) throw updateErr;
        result = { success: true, message: "Account suspended" };
        break;
      }

      case "unsuspend": {
        if (!user_id || !staff_id) throw new Error("Missing user_id or staff_id");
        const { error: unbanErr } = await adminClient.auth.admin.updateUserById(user_id, {
          ban_duration: "none",
        });
        if (unbanErr) throw unbanErr;
        const { error: updateErr } = await adminClient
          .from("staff_profiles")
          .update({ is_active: true })
          .eq("id", staff_id);
        if (updateErr) throw updateErr;
        result = { success: true, message: "Account reactivated" };
        break;
      }

      case "delete": {
        if (!user_id || !staff_id) throw new Error("Missing user_id or staff_id");
        // Delete staff profile first
        const { error: delProfileErr } = await adminClient
          .from("staff_profiles")
          .delete()
          .eq("id", staff_id);
        if (delProfileErr) throw delProfileErr;
        // Delete auth user
        const { error: delAuthErr } = await adminClient.auth.admin.deleteUser(user_id);
        if (delAuthErr) throw delAuthErr;
        result = { success: true, message: "Account permanently deleted" };
        break;
      }

      default:
        return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("manage-staff error:", err);
    return new Response(JSON.stringify({ error: err.message || "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
