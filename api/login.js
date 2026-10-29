
import { createHmac } from "node:crypto";

const VENUES = {
  oneills: "ON",
  junction: "JR"
};

const SESSION_SECONDS = 12 * 60 * 60;

function reply(data, status = 200) {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store" }
  });
}

export async function POST(request) {
  if (
    request.headers.get("origin") &&
    request.headers.get("origin") !== new URL(request.url).origin
  ) {
    return reply({ ok: false, error: "Request not allowed" }, 403);
  }

  const url = process.env.SUPABASE_URL;
  const apiKey = process.env.SUPABASE_SECRET_KEY;
  const pepper = process.env.VIP_PIN_PEPPER;
  const sessionSecret = process.env.VIP_SESSION_SECRET;

  if (!url || !apiKey || !pepper || !sessionSecret ||
      pepper.length < 32 || sessionSecret.length < 32) {
    return reply({ ok: false, error: "Login not configured yet" }, 503);
  }

  let details;

  try {
    const body = await request.text();
    if (body.length > 512) {
      return reply({ ok: false, error: "Invalid request" }, 400);
    }
    details = JSON.parse(body);
  } catch {
    return reply({ ok: false, error: "Invalid request" }, 400);
  }

  const venue = String(details?.venue || "").toLowerCase();
  const number = String(details?.membershipNumber || "")
    .trim().toUpperCase();
  const pin = String(details?.pin || "");

  if (!VENUES[venue] ||
      !number.startsWith(VENUES[venue] + "-") ||
      !/^[A-Z0-9-]{4,20}$/.test(number) ||
      !/^\d{4}$/.test(pin)) {
    return reply({ ok: false, error: "Invalid login details" }, 400);
  }

  try {
    const response = await fetch(
      `${url.replace(/\/$/, "")}/rest/v1/rpc/verify_vip_pin`,
      {
        method: "POST",
        headers: {
          apikey: apiKey,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          p_venue_code: VENUES[venue],
          p_membership_number: number,
          p_pin: pin,
          p_pepper: pepper
        }),
        cache: "no-store"
      }
    );

    if (!response.ok) {
      console.error("VIP login database error:", response.status);
      return reply({ ok: false, error: "Login service unavailable" }, 503);
    }

    const member = await response.json();

    if (!member?.ok || !member.member_id) {
      return reply({
        ok: false,
        error: "Incorrect details or temporarily locked account"
      }, 401);
    }

    const session = {
      sub: member.member_id,
      venue: VENUES[venue],
      exp: Math.floor(Date.now() / 1000) + SESSION_SECONDS
    };

    const payload = Buffer.from(JSON.stringify(session))
      .toString("base64url");

    const signature = createHmac("sha256", sessionSecret)
      .update(payload)
      .digest("base64url");

    const token = `${payload}.${signature}`;

    return Response.json({
      ok: true,
      name: member.full_name,
      membershipNumber: number,
      venue
    }, {
      headers: {
        "Cache-Control": "no-store",
        "Set-Cookie":
          `__Host-vip_session=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_SECONDS}`
      }
    });

  } catch (error) {
    console.error("VIP login failed:", error);
    return reply({ ok: false, error: "Login service unavailable" }, 503);
  }
}
