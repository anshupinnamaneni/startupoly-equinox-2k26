import { createClient } from "npm:@supabase/supabase-js@2.57.4";

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
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing auth header" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { action, matchId, teamId, teamName, password, email } = body;

    // Verify the user owns this match
    const { data: match } = await supabase
      .from("matches")
      .select("id, owner_id")
      .eq("id", matchId)
      .maybeSingle();

    if (!match || match.owner_id !== user.id) {
      return new Response(JSON.stringify({ error: "Only the match organizer can manage teams" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "create_team_account") {
      const teamEmail = email || `team${body.teamNumber}@startupoly.local`;

      // Check if user already exists
      const { data: existingUsers } = await supabase.auth.admin.listUsers();
      const existing = existingUsers?.users?.find((u: any) => u.email === teamEmail);

      let teamUserId: string;

      if (existing) {
        // Update password
        const { error: updateErr } = await supabase.auth.admin.updateUserById(existing.id, { password });
        if (updateErr) {
          return new Response(JSON.stringify({ error: updateErr.message }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        teamUserId = existing.id;
      } else {
        // Create new user
        const { data: newUser, error: createErr } = await supabase.auth.admin.createUser({
          email: teamEmail,
          password,
          email_confirm: true,
          app_metadata: { role: "team", teamId, matchId },
        });
        if (createErr || !newUser?.user) {
          return new Response(JSON.stringify({ error: createErr?.message || "Failed to create user" }), {
            status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
        teamUserId = newUser.user.id;
      }

      // Update app_metadata to link team
      await supabase.auth.admin.updateUserById(teamUserId, {
        app_metadata: { role: "team", teamId, matchId },
      });

      // Create team_members link
      await supabase
        .from("team_members")
        .upsert({ team_id: teamId, user_id: teamUserId }, { onConflict: "team_id,user_id" });

      // Audit log
      await supabase.from("audit_logs").insert({
        match_id: matchId,
        actor_id: user.id,
        action: "TEAM_ACCOUNT_CREATED",
        entity_type: "team",
        entity_id: teamId,
        description: `Created/updated team account for ${teamName}`,
      });

      return new Response(JSON.stringify({ success: true, email: teamEmail, userId: teamUserId }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (action === "rotate_password") {
      const teamEmail = email || `team${body.teamNumber}@startupoly.local`;
      const { data: users } = await supabase.auth.admin.listUsers();
      const existing = users?.users?.find((u: any) => u.email === teamEmail);

      if (!existing) {
        return new Response(JSON.stringify({ error: "Team account not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { error: updateErr } = await supabase.auth.admin.updateUserById(existing.id, { password });
      if (updateErr) {
        return new Response(JSON.stringify({ error: updateErr.message }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await supabase.from("audit_logs").insert({
        match_id: matchId,
        actor_id: user.id,
        action: "PASSWORD_ROTATED",
        entity_type: "team",
        entity_id: teamId,
        description: `Rotated password for ${teamName}`,
      });

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
