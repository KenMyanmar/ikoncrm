import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const VALID_ROLES = ["super_admin", "admin", "manager", "staff", "delivery"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate caller is super_admin or admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify caller's role using their JWT
    const callerClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await callerClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callerId = claimsData.claims.sub as string;

    // Check caller role via DB
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: callerProfile } = await adminClient
      .from("staff_profiles")
      .select("role")
      .eq("user_id", callerId)
      .eq("is_active", true)
      .maybeSingle();

    if (!callerProfile || !["super_admin", "admin"].includes(callerProfile.role)) {
      return new Response(
        JSON.stringify({ error: "Only super_admin or admin can invite staff" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse and validate input
    const { email, full_name, role, department } = await req.json();

    if (!email || !full_name || !role) {
      return new Response(
        JSON.stringify({ error: "email, full_name, and role are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!VALID_ROLES.includes(role)) {
      return new Response(
        JSON.stringify({ error: `Invalid role. Must be one of: ${VALID_ROLES.join(", ")}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Prevent non-super_admin from creating super_admin
    if (role === "super_admin" && callerProfile.role !== "super_admin") {
      return new Response(
        JSON.stringify({ error: "Only super_admin can create super_admin accounts" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if email already exists in staff_profiles
    const { data: existing } = await adminClient
      .from("staff_profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (existing) {
      return new Response(
        JSON.stringify({ error: "A staff member with this email already exists" }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create auth user with a random password (they'll reset it)
    const tempPassword = crypto.randomUUID() + "Aa1!";
    const { data: authUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password: tempPassword,
      email_confirm: true,
      user_metadata: { full_name },
    });

    if (createError) {
      // If user already exists in auth but not in staff_profiles, get their id
      if (createError.message?.includes("already been registered")) {
        const { data: { users } } = await adminClient.auth.admin.listUsers();
        const existingUser = users?.find((u: any) => u.email === email);
        if (existingUser) {
          const { error: insertError } = await adminClient.from("staff_profiles").insert({
            user_id: existingUser.id,
            email,
            full_name,
            role,
            department: department || null,
          });
          if (insertError) {
            return new Response(
              JSON.stringify({ error: insertError.message }),
              { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
          }
          return new Response(
            JSON.stringify({ success: true, message: "Existing auth user linked as staff" }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }
      return new Response(
        JSON.stringify({ error: createError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Insert staff profile
    const { error: insertError } = await adminClient.from("staff_profiles").insert({
      user_id: authUser.user.id,
      email,
      full_name,
      role,
      department: department || null,
    });

    if (insertError) {
      // Cleanup: delete auth user if profile insert fails
      await adminClient.auth.admin.deleteUser(authUser.user.id);
      return new Response(
        JSON.stringify({ error: insertError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send invite email so they can set their own password
    const { error: inviteError } = await adminClient.auth.resetPasswordForEmail(email, {
      redirectTo: `${Deno.env.get("SUPABASE_URL")?.replace('.supabase.co', '.supabase.co')}`,
    });
    if (inviteError) {
      console.warn("Password reset email failed:", inviteError.message);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Staff member ${full_name} created successfully`,
        user_id: authUser.user.id,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("invite-staff error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
