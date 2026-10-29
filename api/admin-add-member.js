
import {
  createHmac,
  timingSafeEqual
} from "node:crypto";

const reply = (data, status = 200) => Response.json(data, {
  status,
  headers: { "Cache-Control": "no-store" }
});

function getAdminId(request, secret) {
  const cookie = (request.headers.get("cookie") || "")
    .split(";")
    .map(x => x.trim())
    .find(x => x.startsWith("__Host-vip_admin="));

  const token = cookie?.slice("__Host-vip_admin=".length);

  if (!token || token.length > 4096) return null;

  const parts = token.split(".");

  if (
    parts.length !== 2 ||
    !parts.every(x => /^[A-Za-z0-9_-]+$/.test(x))
  ) {
    return null;
  }

  const expected = createHmac("sha256", secret)
    .update("admin." + parts[0])
    .digest();

  const actual = Buffer.from(parts[1], "base64url");

  if (
    actual.length !== expected.length ||
    !timingSafeEqual(actual, expected)
  ) {
    return null;
  }

  const session = JSON.parse(
    Buffer.from(parts[0], "base64url").toString()
  );

  if (
    session.type !== "vip_admin" ||
    !Number.isSafeInteger(session.exp) ||
    session.exp <= Math.floor(Date.now() / 1000) ||
    !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i
      .test(session.sub || "")
  ) {
    return null;
  }

  return session.sub;
}

export async function POST(request) {
  const origin = request.headers.get("origin");

  if (origin !== new URL(request.url).origin) {
    return reply({
      ok: false,
      error: "Request not allowed"
    }, 403);
  }

  if (
    !request.headers.get("content-type")
      ?.startsWith("application/json")
  ) {
    return reply({
      ok: false,
      error: "Invalid request format"
    }, 415);
  }

  const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.SUPABASE_SECRET_KEY;
  const secret = process.env.VIP_SESSION_SECRET;
  const pepper = process.env.VIP_PIN_PEPPER;

  if (
    !url ||
    !key ||
    !secret ||
    secret.length < 32 ||
    !pepper ||
    pepper.length < 32 ||
    pepper.length > 64
  ) {
    return reply({
      ok: false,
      error: "Server not configured"
    }, 503);
  }

  let adminId;

  try {
    adminId = getAdminId(request, secret);
  } catch {
    adminId = null;
  }

  if (!adminId) {
    return reply({
      ok: false,
      error: "Sign in as administrator"
    }, 401);
  }

  try {
    // Check administrator permission on every request
    const auth = await fetch(
      `${url}/rest/v1/admin_users` +
      `?user_id=eq.${adminId}` +
      `&select=role,is_active&limit=1`,
      {
        headers: {
          apikey: key,
          Accept: "application/json"
        },
        cache: "no-store"
      }
    );

    if (!auth.ok) {
      return reply({
        ok: false,
        error: "Admin check unavailable"
      }, 503);
    }

    const [admin] = await auth.json();

    if (
      !admin?.is_active ||
      !["owner", "manager"].includes(admin.role)
    ) {
      return reply({
        ok: false,
        error: "Administrator access required"
      }, 403);
    }

    // Read customer details
    const raw = await request.text();

    if (raw.length > 1024) {
      return reply({
        ok: false,
        error: "Invalid request"
      }, 400);
    }

    const data = JSON.parse(raw);

    const venueCode = data?.venueCode;

    const fullName =
      typeof data?.fullName === "string"
        ? data.fullName.trim()
        : "";

    const pin = data?.pin;

    if (
      !["ON", "JR"].includes(venueCode) ||
      fullName.length < 2 ||
      fullName.length > 100 ||
      typeof pin !== "string" ||
      !/^\d{4}$/.test(pin) ||
      ["0000", "1111", "1234", "4321", "9999"]
        .includes(pin)
    ) {
      return reply({
        ok: false,
        error: "Check the venue, name and PIN. Avoid common PINs."
      }, 400);
    }

    // Create member using our protected Supabase function
    const create = await fetch(
      `${url}/rest/v1/rpc/create_vip_member`,
      {
        method: "POST",
        headers: {
          apikey: key,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          p_venue_code: venueCode,
          p_full_name: fullName,
          p_pin: pin,
          p_pepper: pepper
        }),
        cache: "no-store"
      }
    );

    if (!create.ok) {
      console.error(
        "Member creation failed:",
        create.status
      );

      return reply({
        ok: false,
        error: "Could not create member. Check server logs."
      }, 503);
    }

    const member = await create.json();

    if (!member?.ok || !member.membership_number) {
      return reply({
        ok: false,
        error: "Member creation failed"
      }, 503);
    }

    return reply({
      ok: true,
      membershipNumber: member.membership_number,
      fullName: member.full_name,
      venueCode: member.venue_code
    }, 201);

  } catch (error) {
    console.error("Add member error:", error);

    return reply({
      ok: false,
      error: "Could not complete request"
    }, 503);
  }
}
