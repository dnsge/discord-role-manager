// src/index.ts
import { AutoRouter } from "itty-router";
import { sign, verify } from "@tsndr/cloudflare-worker-jwt";

// Types
interface AccessTokenData {
  access_token: string;
}

interface DiscordUser {
  id: string;
  username: string;
  bot: boolean;
}

interface GuildMember {
  user: DiscordUser;
  roles: string[];
}

interface UpdateRequest {
  changes: {
    userId: string;
    action: "add" | "remove";
    role: "Current Member" | "Former Member";
  }[];
}

// Constants
const DISCORD_API = "https://discord.com/api/v10";

// Create Router
const router = AutoRouter();

// Middleware to verify JWT
async function authenticateJWT(request: Request, env: Env) {
  const authHeader = request.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response("Unauthorized", { status: 401 });
  }

  const token = authHeader.split(" ")[1];
  try {
    const isValid = await verify(token, env.JWT_SECRET);
    if (!isValid) {
      return new Response("Unauthorized", { status: 401 });
    }
    return null; // Continue to next handler
  } catch {
    return new Response("Unauthorized", { status: 401 });
  }
}

async function createJWT(userId: string, secret: string): Promise<string> {
  const token = await sign(
    {
      sub: userId,
      nbf: Math.floor(Date.now() / 1000), // not before
      exp: Math.floor(Date.now() / 1000) + 2 * (60 * 60), // expires: Now + 2h
    },
    secret
  );
  return token;
}

// Discord OAuth endpoints
router.get("/api/auth/discord", async (request: Request, env: Env) => {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  if (!code) {
    return new Response("Missing code", { status: 400 });
  }

  try {
    // Exchange code for access token
    const tokenResponse = await fetch(`${DISCORD_API}/oauth2/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: env.DISCORD_CLIENT_ID,
        client_secret: env.DISCORD_CLIENT_SECRET,
        code,
        grant_type: "authorization_code",
        redirect_uri: env.DISCORD_REDIRECT_URI,
      }),
    });

    const tokenJSON: AccessTokenData = await tokenResponse.json();
    if (!tokenResponse.ok) {
      console.log("Invalid authorization code:", tokenJSON);
      return new Response("Invalid authorization code", { status: 400 });
    }
    const { access_token } = tokenJSON;

    // Get user info
    const userResponse = await fetch(`${DISCORD_API}/users/@me`, {
      method: "GET",
      headers: { Authorization: `Bearer ${access_token}` },
    });

    const user: DiscordUser = await userResponse.json();
    if (!userResponse.ok) {
      console.error("Failed to query user:", user);
      return new Response("Failed to query user", { status: 500 });
    }

    // Get user's guild roles
    const guildMemberResponse = await fetch(
      `${DISCORD_API}/guilds/${env.GUILD_ID}/members/${user.id}`,
      {
        method: "GET",
        headers: { Authorization: `Bot ${env.DISCORD_BOT_TOKEN}` },
      }
    );
    const guildMember: GuildMember = await guildMemberResponse.json();
    console.info(guildMember);

    // Check if user has moderator role
    const isModerator = guildMember.roles.includes(env.MODERATOR_ROLE_ID);
    if (!isModerator) {
      return new Response("Unauthorized", { status: 403 });
    }

    // Create JWT
    const token = await createJWT(user.id, env.JWT_SECRET);

    return new Response(JSON.stringify({ token }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Authentication failed", error);
    return new Response("Authentication failed", { status: 500 });
  }
});

router.get("/api/members", async (request: Request, env: Env) => {
  const authResponse = await authenticateJWT(request, env);
  if (authResponse) return authResponse;

  try {
    let members: GuildMember[] = [];
    let after: string | null = null;

    // Discord returns members in batches of 1000, so we need to paginate
    while (true) {
      const url = new URL(`${DISCORD_API}/guilds/${env.GUILD_ID}/members`);
      url.searchParams.set("limit", "1000");
      if (after) url.searchParams.set("after", after);

      const response = await fetch(url.toString(), {
        headers: {
          Authorization: `Bot ${env.DISCORD_BOT_TOKEN}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch members: ${response.statusText}`);
      }

      const batch: GuildMember[] = await response.json();
      if (batch.length === 0) break;

      members = members.concat(batch);
      after = batch[batch.length - 1].user.id;

      // If we got less than 1000 members, we've reached the end
      if (batch.length < 1000) break;
    }

    // Format the response to include role status
    const formattedMembers = members
      .filter((member) => !member.user.bot) // Ignore bots
      .map((member) => ({
        id: member.user.id,
        username: member.user.username,
        roles: {
          currentMember: member.roles.includes(env.CURRENT_MEMBER_ROLE_ID),
          formerMember: member.roles.includes(env.FORMER_MEMBER_ROLE_ID),
        },
      }));

    return new Response(JSON.stringify({ members: formattedMembers }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error fetching members:", error);
    return new Response("Failed to fetch members", { status: 500 });
  }
});

// Protected endpoints
router.post("/api/members/update", async (request: Request, env: Env) => {
  const authResponse = await authenticateJWT(request, env);
  if (authResponse) return authResponse;

  const { changes }: UpdateRequest = await request.json();
  const results = [];

  for (const change of changes) {
    if (change.action !== "add" && change.action !== "remove") {
      results.push({
        userId: change.userId,
        success: false,
        error: "Invalid action",
      });
      continue;
    }

    try {
      const roleId = getRoleId(change.role, env);
      const endpoint = `${DISCORD_API}/guilds/${env.GUILD_ID}/members/${change.userId}/roles/${roleId}`;
      const response = await fetch(endpoint, {
        method: change.action === "add" ? "PUT" : "DELETE",
        headers: { Authorization: `Bot ${env.DISCORD_BOT_TOKEN}` },
      });

      if (!response.ok) {
        const responseData = await response.json();
        console.log("failed to change role:", JSON.stringify(responseData));
      }

      results.push({
        userId: change.userId,
        success: response.ok,
        status: response.status,
      });
    } catch (error) {
      results.push({
        userId: change.userId,
        success: false,
        error: "Failed to update role",
      });
    }
  }

  return new Response(JSON.stringify({ results }), {
    headers: { "Content-Type": "application/json" },
  });
});

function getRoleId(role: string, env: Env): string {
  switch (role) {
    case "Current Member":
      return env.CURRENT_MEMBER_ROLE_ID;
    case "Former Member":
      return env.FORMER_MEMBER_ROLE_ID;
    default:
      throw new Error("Invalid role");
  }
}

// Export worker handler
export default router;
