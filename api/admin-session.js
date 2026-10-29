
import {
  createHmac,
  timingSafeEqual
} from "node:crypto";

function reply(data, status = 200) {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store"
    }
  });
}

export async function GET(request) {
  const secret = process.env.VIP_SESSION_SECRET;
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;

  if (!secret || secret.length < 32 || !url || !key) {
    return reply({
      ok: false,
      error: "Server not configured"
    }, 503);
  }

  // Find the secure administrator cookie
  const cookies = request.headers.get("cookie") || "";

  const token = cookies
    .split(";")
    .map(item => item.trim())
    .find(item => item.startsWith("__Host-vip_admin="))
    ?.slice("__Host-vip_admin=".length);

  if (!token || token.length > 4096) {
    return reply({ ok: false }, 401);
  }

  try {
    const parts = token.split(".");

    if (
      parts.length !== 2 ||
      !parts.every(part => /^[A-Za-z0-9_-]+$/.test(part))
    ) {
      return reply({ ok: false }, 401);
    }

    const [payload, signature] = parts;

    // Verify the session signature
    const expected = createHmac("sha256", secret)
      .update("admin." + payload)
      .digest();

    const actual = Buffer.from(signature, "base64url");

    if (
      actual.length !== expected.length ||
      !timingSafeEqual(actual, expected)
    ) {
      return reply({ ok: false }, 401);
    }

    const session = JSON.parse(
      Buffer.from(payload, "base64url").toString("utf8")
    );

    if (
      session.type !== "vip_admin" ||
      !Number.isSafeInteger(session.exp) ||
      session.exp <= Math.floor(Date.now() / 1000) ||
      !/^[0-9a-f-]{36}$/i.test(session.sub || "")
    ) {
      return reply({ ok: false }, 401);
    }

    // Recheck the administrator's current permissions
    const response = await fetch(
      `${url.replace(/\/$/, "")}/rest/v1/admin_users` +
      `?user_id=eq.${encodeURIComponent(session.sub)}` +
      `&select=role,is_active&limit=1`,
      {
        headers: {
          apikey: key,
          Accept: "application/json"
        },
        cache: "no-store"
      }
    );

    if (!response.ok) {
      return reply({
        ok: false,
        error: "Permission check unavailable"
      }, 503);
    }

    const admins = await response.json();
    const admin = admins[0];

    if (
      !admin?.is_active ||
      !["owner", "manager"].includes(admin.role)
    ) {
      return reply({ ok: false }, 403);
    }

    return reply({
      ok: true,
      role: admin.role
    });

  } catch (error) {
    console.error("Admin session check failed:", error);
    return reply({ ok: false }, 401);
  }
}
