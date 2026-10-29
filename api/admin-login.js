
/*
 * O'Neills & The Junction VIP
 * Secure Administrator Login
 * File: api/admin-login.js
 */

import { createHmac } from "node:crypto";

const SESSION_SECONDS = 2 * 60 * 60;

function json(data, status = 200, extraHeaders = {}) {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
      ...extraHeaders
    }
  });
}

export async function POST(request) {

  // Only accept requests from our own website
  const origin = request.headers.get("origin");

  if (origin && origin !== new URL(request.url).origin) {
    return json({
      ok: false,
      error: "Request not allowed"
    }, 403);
  }

  // Vercel environment variables
  const url = process.env.SUPABASE_URL;
  const publicKey = process.env.SUPABASE_PUBLISHABLE_KEY;
  const secretKey = process.env.SUPABASE_SECRET_KEY;
  const sessionSecret = process.env.VIP_SESSION_SECRET;

  if (
    !url ||
    !publicKey ||
    !secretKey ||
    !sessionSecret ||
    sessionSecret.length < 32
  ) {
    return json({
      ok: false,
      error: "Admin login is not configured"
    }, 503);
  }

  // Read submitted login details
  let body;

  try {
    const raw = await request.text();

    if (raw.length > 4096) {
      return json({
        ok: false,
        error: "Invalid request"
      }, 400);
    }

    body = JSON.parse(raw);

  } catch {
    return json({
      ok: false,
      error: "Invalid request"
    }, 400);
  }

  const email =
    typeof body?.email === "string"
      ? body.email.trim().toLowerCase()
      : "";

  const password = body?.password;

  if (
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
    email.length > 254 ||
    typeof password !== "string" ||
    password.length === 0 ||
    password.length > 1024
  ) {
    return json({
      ok: false,
      error: "Invalid email or password"
    }, 401);
  }

  const baseUrl = url.replace(/\/$/, "");

  try {

    // STEP 1: Verify email and password
    const authResponse = await fetch(
      `${baseUrl}/auth/v1/token?grant_type=password`,
      {
        method: "POST",
        headers: {
          apikey: publicKey,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          email,
          password
        }),
        cache: "no-store"
      }
    );

    if (!authResponse.ok) {
      if (authResponse.status >= 500) {
        return json({
          ok: false,
          error: "Admin login service unavailable"
        }, 503);
      }

      return json({
        ok: false,
        error: "Invalid email or password"
      }, 401);
    }

    const authData = await authResponse.json();
    const userId = authData?.user?.id;

    if (
      !userId ||
      !/^[0-9a-f-]{36}$/i.test(userId)
    ) {
      return json({
        ok: false,
        error: "Unable to verify account"
      }, 401);
    }

    // STEP 2: Check administrator permissions
    const permissionUrl =
      `${baseUrl}/rest/v1/admin_users` +
      `?user_id=eq.${encodeURIComponent(userId)}` +
      `&select=role,is_active&limit=1`;

    const permissionsResponse = await fetch(
      permissionUrl,
      {
        headers: {
          apikey: secretKey,
          Accept: "application/json"
        },
        cache: "no-store"
      }
    );

    if (!permissionsResponse.ok) {
      console.error(
        "Admin permission lookup failed:",
        permissionsResponse.status
      );

      return json({
        ok: false,
        error: "Admin service unavailable"
      }, 503);
    }

    const admins = await permissionsResponse.json();
    const admin = admins[0];

    if (
      !admin?.is_active ||
      !["owner", "manager"].includes(admin.role)
    ) {
      return json({
        ok: false,
        error: "Administrator access required"
      }, 403);
    }

    // STEP 3: Create secure administrator session
    const session = {
      type: "vip_admin",
      sub: userId,
      role: admin.role,
      exp: Math.floor(Date.now() / 1000) + SESSION_SECONDS
    };

    const payload = Buffer.from(
      JSON.stringify(session)
    ).toString("base64url");

    const signature = createHmac(
      "sha256",
      sessionSecret
    )
      .update("admin." + payload)
      .digest("base64url");

    const token = `${payload}.${signature}`;

    // Store session in secure HttpOnly cookie
    const cookie =
      `__Host-vip_admin=${token}; ` +
      `Path=/; HttpOnly; Secure; ` +
      `SameSite=Strict; Max-Age=${SESSION_SECONDS}`;

    return json(
      {
        ok: true,
        role: admin.role,
        message: "Administrator login successful"
      },
      200,
      {
        "Set-Cookie": cookie
      }
    );

  } catch (error) {
    console.error(
      "VIP administrator login failed:",
      error
    );

    return json({
      ok: false,
      error: "Unable to contact login service"
    }, 503);
  }
}
