
import {
  createHmac,
  timingSafeEqual
} from "node:crypto";

const PAGE_SIZE = 20;

function reply(data, status = 200) {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store" }
  });
}

function adminIdFromCookie(request, secret) {
  try {
    const cookie = (request.headers.get("cookie") || "")
      .split(";")
      .map(x => x.trim())
      .find(x => x.startsWith("__Host-vip_admin="));

    if (!cookie) return null;

    const token = cookie.slice(
      "__Host-vip_admin=".length
    );

    if (token.length > 4096) return null;

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

    const actual = Buffer.from(
      parts[1], "base64url"
    );

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
  } catch {
    return null;
  }
}

async function handle(request, method) {
  const url = process.env.SUPABASE_URL
    ?.replace(/\/$/, "");

  const key = process.env.SUPABASE_SECRET_KEY;
  const secret = process.env.VIP_SESSION_SECRET;
  const pepper = process.env.VIP_PIN_PEPPER;

  if (!url || !key || !secret || secret.length < 32) {
    return reply({
      ok: false,
      error: "Server not configured"
    }, 503);
  }

  if (method === "POST") {
    if (
      request.headers.get("origin") !==
      new URL(request.url).origin
    ) {
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
  }

  const userId = adminIdFromCookie(request, secret);

  if (!userId) {
    return reply({
      ok: false,
      error: "Administrator login required"
    }, 401);
  }

  const headers = {
    apikey: key,
    "Content-Type": "application/json",
    Accept: "application/json"
  };

  try {
    // Check current admin permissions EVERY time
    const permissionResponse = await fetch(
      `${url}/rest/v1/admin_users` +
      `?user_id=eq.${userId}` +
      `&select=role,is_active&limit=1`,
      {
        headers,
        cache: "no-store"
      }
    );

    if (!permissionResponse.ok) {
      throw new Error("Admin permission lookup failed");
    }

    const [admin] = await permissionResponse.json();

    if (
      !admin?.is_active ||
      !["owner", "manager"].includes(admin.role)
    ) {
      return reply({
        ok: false,
        error: "Administrator access required"
      }, 403);
    }

    // LIST AND SEARCH MEMBERS
    if (method === "GET") {
      const query = new URL(request.url);

      const venue = query.searchParams.get("venue") || "both";

      if (!["both", "ON", "JR"].includes(venue)) {
        return reply({
          ok: false,
          error: "Invalid venue"
        }, 400);
      }

      const rawPage = query.searchParams.get("page") || "0";

      if (!/^\d{1,4}$/.test(rawPage)) {
        return reply({
          ok: false,
          error: "Invalid page"
        }, 400);
      }

      const page = Number(rawPage);

      const search = (query.searchParams.get("q") || "")
        .trim()
        .replace(/[^A-Za-z0-9À-ÿ -]/g, "")
        .slice(0, 50);

      const params = new URLSearchParams({
        select:
          "id,full_name,membership_number," +
          "venue_code,is_active,created_at,last_login_at",
        order: "created_at.desc,id.desc",
        limit: String(PAGE_SIZE),
        offset: String(page * PAGE_SIZE)
      });

      if (venue !== "both") {
        params.set("venue_code", "eq." + venue);
      }

      if (search) {
        params.set(
          "or",
          `(full_name.ilike.*${search}*,` +
          `membership_number.ilike.*${search}*)`
        );
      }

      const response = await fetch(
        `${url}/rest/v1/members?${params}`,
        {
          headers: {
            ...headers,
            Prefer: "count=exact"
          },
          cache: "no-store"
        }
      );

      if (!response.ok) {
        throw new Error("Could not list members");
      }

      const members = await response.json();

      const range = response.headers.get("content-range");
      const totalText = range?.split("/")[1];

      const total =
        totalText && /^\d+$/.test(totalText)
          ? Number(totalText)
          : members.length;

      return reply({
        ok: true,
        members,
        page,
        pageSize: PAGE_SIZE,
        total
      });
    }

    // UPDATE ONE MEMBER
    const raw = await request.text();

    if (raw.length > 2048) {
      return reply({
        ok: false,
        error: "Invalid request"
      }, 400);
    }

    let data;

    try {
      data = JSON.parse(raw);
    } catch {
      return reply({
        ok: false,
        error: "Invalid request"
      }, 400);
    }

    const memberId = data?.memberId;
    const action = data?.action;

    if (
      typeof memberId !== "string" ||
      !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i
        .test(memberId)
    ) {
      return reply({
        ok: false,
        error: "Invalid member"
      }, 400);
    }

    // ACTIVATE OR DEACTIVATE
    if (action === "set-status") {
      if (typeof data.active !== "boolean") {
        return reply({
          ok: false,
          error: "Invalid account status"
        }, 400);
      }

      const response = await fetch(
        `${url}/rest/v1/members` +
        `?id=eq.${memberId}` +
        `&select=id,is_active`,
        {
          method: "PATCH",
          headers: {
            ...headers,
            Prefer: "return=representation"
          },
          body: JSON.stringify({
            is_active: data.active,
            failed_attempts: 0,
            locked_until: null
          }),
          cache: "no-store"
        }
      );

      if (!response.ok) {
        throw new Error("Could not update membership");
      }

      const rows = await response.json();

      if (!rows.length) {
        return reply({
          ok: false,
          error: "Member not found"
        }, 404);
      }

      return reply({
        ok: true,
        active: rows[0].is_active
      });
    }

    // RESET THE FOUR-DIGIT PIN
    if (action === "reset-pin") {
      const pin = data?.pin;

      if (
        typeof pin !== "string" ||
        !/^\d{4}$/.test(pin) ||
        ["0000", "1111", "1234", "4321", "9999"]
          .includes(pin)
      ) {
        return reply({
          ok: false,
          error: "Choose a less predictable 4-digit PIN"
        }, 400);
      }

      if (
        !pepper ||
        pepper.length < 32 ||
        pepper.length > 64
      ) {
        return reply({
          ok: false,
          error: "PIN service not configured"
        }, 503);
      }

      const response = await fetch(
        `${url}/rest/v1/rpc/reset_vip_pin`,
        {
          method: "POST",
          headers,
          body: JSON.stringify({
            p_member_id: memberId,
            p_pin: pin,
            p_pepper: pepper
          }),
          cache: "no-store"
        }
      );

      if (!response.ok) {
        throw new Error("PIN reset failed");
      }

      const result = await response.json();

      if (!result?.ok) {
        return reply({
          ok: false,
          error: "Member not found"
        }, 404);
      }

      return reply({
        ok: true,
        message: "PIN updated successfully"
      });
    }

    return reply({
      ok: false,
      error: "Unknown action"
    }, 400);

  } catch (error) {
    console.error("VIP Members error:", error);

    return reply({
      ok: false,
      error: "Member service unavailable"
    }, 503);
  }
}

export async function GET(request) {
  return handle(request, "GET");
}

export async function POST(request) {
  return handle(request, "POST");
}
