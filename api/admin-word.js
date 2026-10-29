
import {
  createHmac,
  timingSafeEqual
} from "node:crypto";

const WORDS = [
  "SHAMROCK", "EMERALD", "CLOVER", "HARBOUR",
  "CHEERS", "ANCHOR", "ROCKSTAR", "SUNSET",
  "LEGEND", "GOLDEN", "COUNTRY", "MARINA",
  "WHISKEY", "RODEO", "LUCKY", "MUSIC",
  "CHAMPION", "DIAMOND", "HORIZON", "FREEDOM"
];

function reply(data, status = 200) {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store" }
  });
}

function lisbonDate() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Lisbon",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date());

  const part = type =>
    parts.find(p => p.type === type)?.value;

  return `${part("year")}-${part("month")}-${part("day")}`;
}

function getAdminId(request, secret) {
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
      !parts.every(p => /^[A-Za-z0-9_-]+$/.test(p))
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
      Buffer.from(parts[0], "base64url")
        .toString("utf8")
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

async function verifyAdmin(request, url, key, secret) {
  const userId = getAdminId(request, secret);

  if (!userId) return false;

  const response = await fetch(
    `${url}/rest/v1/admin_users` +
    `?user_id=eq.${userId}` +
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
    throw new Error("Admin verification unavailable");
  }

  const [admin] = await response.json();

  return Boolean(
    admin?.is_active &&
    ["owner", "manager"].includes(admin.role)
  );
}

async function handle(request, method) {
  const url = process.env.SUPABASE_URL
    ?.replace(/\/$/, "");

  const key = process.env.SUPABASE_SECRET_KEY;
  const secret = process.env.VIP_SESSION_SECRET;

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

  try {
    const allowed = await verifyAdmin(
      request, url, key, secret
    );

    if (!allowed) {
      return reply({
        ok: false,
        error: "Administrator login required"
      }, 401);
    }

    let venueCode;
    let action;
    let word;

    if (method === "GET") {
      venueCode = new URL(request.url)
        .searchParams.get("venue");

    } else {
      const raw = await request.text();

      if (raw.length > 1024) {
        return reply({
          ok: false,
          error: "Invalid request"
        }, 400);
      }

      const data = JSON.parse(raw);

      venueCode = data.venueCode;
      action = data.action;
      word = typeof data.word === "string"
        ? data.word.trim().toUpperCase()
        : "";
    }

    if (!["ON", "JR"].includes(venueCode)) {
      return reply({
        ok: false,
        error: "Select a valid venue"
      }, 400);
    }

    const today = lisbonDate();

    const endpoint =
      `${url}/rest/v1/daily_words` +
      `?venue_code=eq.${venueCode}` +
      `&word_date=eq.${today}`;

    const headers = {
      apikey: key,
      "Content-Type": "application/json"
    };

    // SET A CUSTOM WORD
    if (method === "POST" && action === "set") {
      if (!/^[A-Z]{3,24}$/.test(word)) {
        return reply({
          ok: false,
          error: "Use 3–24 letters, without spaces"
        }, 400);
      }

      const response = await fetch(
        `${url}/rest/v1/daily_words` +
        `?on_conflict=venue_code,word_date`,
        {
          method: "POST",
          headers: {
            ...headers,
            Prefer: "resolution=merge-duplicates,return=minimal"
          },
          body: JSON.stringify([{
            venue_code: venueCode,
            word_date: today,
            word
          }]),
          cache: "no-store"
        }
      );

      if (!response.ok) {
        throw new Error(
          `Save word failed: ${response.status}`
        );
      }
    }

    // REMOVE MANUAL WORD AND RETURN TO AUTOMATIC
    if (method === "POST" && action === "reset") {
      const response = await fetch(endpoint, {
        method: "DELETE",
        headers,
        cache: "no-store"
      });

      if (!response.ok) {
        throw new Error(
          `Reset word failed: ${response.status}`
        );
      }
    }

    if (
      method === "POST" &&
      !["set", "reset"].includes(action)
    ) {
      return reply({
        ok: false,
        error: "Invalid action"
      }, 400);
    }

    // READ TODAY'S MANUAL WORD, IF ANY
    const lookup = await fetch(
      `${endpoint}&select=word&limit=1`,
      {
        headers,
        cache: "no-store"
      }
    );

    if (!lookup.ok) {
      throw new Error(
        `Word lookup failed: ${lookup.status}`
      );
    }

    const rows = await lookup.json();
    const manualWord = rows[0]?.word;

    // MUST MATCH THE EXISTING MEMBER-CARD ALGORITHM
    const digest = createHmac("sha256", secret)
      .update(`daily-word:${today}:${venueCode}`)
      .digest();

    const automaticWord =
      WORDS[digest.readUInt32BE(0) % WORDS.length];

    return reply({
      ok: true,
      venueCode,
      date: today,
      word: manualWord || automaticWord,
      source: manualWord ? "manual" : "automatic"
    });

  } catch (error) {
    console.error("Admin daily word error:", error);

    return reply({
      ok: false,
      error: "Unable to manage daily word"
    }, 503);
  }
}

export async function GET(request) {
  return handle(request, "GET");
}

export async function POST(request) {
  return handle(request, "POST");
}
