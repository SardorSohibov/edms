import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: callerProfile } = await adminClient
      .from("profiles")
      .select("role, department")
      .eq("id", user.id)
      .maybeSingle();

    if (!callerProfile || !["admin", "director"].includes(callerProfile.role)) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    const path = url.pathname.replace("/manage-users", "");

    if (req.method === "POST" && path === "/create") {
      const body = await req.json();
      const { full_name, email, password, role, department } = body;

      if (!full_name || !email || !password || !role) {
        return new Response(JSON.stringify({ error: "Missing required fields" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (callerProfile.role === "director" && role !== "employee") {
        return new Response(JSON.stringify({ error: "Directors can only create employees" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

      if (authError || !authData.user) {
        return new Response(JSON.stringify({ error: authError?.message || "Failed to create auth user" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const initials = full_name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);
      const effectiveDepartment = callerProfile.role === "director" ? callerProfile.department : department;

      const { data: profile, error: profileError } = await adminClient
        .from("profiles")
        .insert({
          id: authData.user.id,
          full_name,
          email,
          role,
          department: effectiveDepartment || "",
          created_by: user.id,
          avatar_initials: initials,
        })
        .select()
        .single();

      if (profileError) {
        await adminClient.auth.admin.deleteUser(authData.user.id);
        return new Response(JSON.stringify({ error: profileError.message }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await adminClient.from("system_logs").insert({
        user_id: user.id,
        action: "CREATE_USER",
        entity_type: "profile",
        entity_id: profile.id,
        details: { role, department: effectiveDepartment, email },
      });

      return new Response(JSON.stringify({ data: profile }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (req.method === "PUT" && path.startsWith("/update/")) {
      const targetId = path.replace("/update/", "");
      const body = await req.json();

      const { data: target } = await adminClient
        .from("profiles")
        .select("role, department")
        .eq("id", targetId)
        .maybeSingle();

      if (!target) {
        return new Response(JSON.stringify({ error: "User not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (callerProfile.role === "director" && target.role !== "employee") {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const updates: Record<string, unknown> = {};
      if (body.full_name !== undefined) {
        updates.full_name = body.full_name;
        updates.avatar_initials = body.full_name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);
      }
      if (body.department !== undefined) updates.department = body.department;
      if (body.is_active !== undefined) updates.is_active = body.is_active;

      const { data: updated, error: updateError } = await adminClient
        .from("profiles")
        .update(updates)
        .eq("id", targetId)
        .select()
        .single();

      if (updateError) {
        return new Response(JSON.stringify({ error: updateError.message }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await adminClient.from("system_logs").insert({
        user_id: user.id,
        action: "UPDATE_USER",
        entity_type: "profile",
        entity_id: targetId,
        details: updates,
      });

      return new Response(JSON.stringify({ data: updated }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
