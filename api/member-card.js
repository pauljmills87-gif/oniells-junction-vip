
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

  const value = name =>
    parts.find(part => part.type === name)?.value;

  return `${value("year")}-${value("month")}-${value("day")}`;
}

function verifySession(request, secret) {
  const cookie = (request.headers.get("cookie") || "")
    .split(";")
    .map(part => part.trim())
    .find(part =>
      part.startsWith("__Host-vip_session=")
    );

  if (!cookie) return null;

  const token = cookie.slice(
    "__Host-vip_session=".length
  );

  if (token.length > 4096) return null;

  const pieces = token.split(".");

  if (
    pieces.length !== 2 ||
    !pieces.every(p => /^[A-Za-z0-9_-]+$/.test(p))
  ) {
    return null;
  }

  const [payload, signature] = pieces;

  const expected = createHmac("sha256", secret)
    .update(payload)
    .digest();

  const actual = Buffer.from(signature, "base64url");

  if (
    actual.length !== expected.length ||
    !timingSafeEqual(actual, expected)
  ) {
    return null;
  }

  const session = JSON.parse(
    Buffer.from(payload, "base64url").toString()
  );

  if (
    !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i
      .test(session.sub || "") ||
    !["ON", "JR"].includes(session.venue) ||
    !Number.isSafeInteger(session.exp) ||
    session.exp <= Math.floor(Date.now() / 1000)
  ) {
    return null;
  }

  return session;
}

export async function GET(request) {
  const url = process.env.SUPABASE_URL
    ?.replace(/\/$/, "");

  const key = process.env.SUPABASE_SECRET_KEY;
  const secret = process.env.VIP_SESSION_SECRET;

  if (!url || !key || !secret || secret.length < 32) {
    return reply({
      ok: false,
      error: "Service not configured"
    }, 503);
  }

  let session;

  try {
    session = verifySession(request, secret);
  } catch {
    session = null;
  }

  if (!session) {
    return reply({
      ok: false,
      error: "Please log in"
    }, 401);
  }

  try {
    // Retrieve only this logged-in member
    const memberResponse = await fetch(
      `${url}/rest/v1/members` +
      `?id=eq.${session.sub}` +
      `&select=full_name,membership_number,venue_code,is_active` +
      `&limit=1`,
      {
        headers: {
          apikey: key,
          Accept: "application/json"
        },
        cache: "no-store"
      }
    );

    if (!memberResponse.ok) {
      throw new Error("Member lookup failed");
    }

    const [member] = await memberResponse.json();

    if (
      !member?.is_active ||
      member.venue_code !== session.venue
    ) {
      return reply({
        ok: false,
        error: "Membership not active"
      }, 403);
    }

    // Check for an admin-selected Word of the Day
    const today = lisbonDate();

    const wordResponse = await fetch(
      `${url}/rest/v1/daily_words` +
      `?venue_code=eq.${session.venue}` +
      `&word_date=eq.${today}` +
      `&select=word&limit=1`,
      {
        headers: {
          apikey: key,
          Accept: "application/json"
        },
        cache: "no-store"
      }
    );

    if (!wordResponse.ok) {
      throw new Error("Daily word lookup failed");
    }

    const savedWords = await wordResponse.json();

    let word = savedWords[0]?.word;

    // Automatically select a consistent word per day
    // and venue until an admin chooses an override
    if (!word) {
      const digest = createHmac("sha256", secret)
        .update(`daily-word:${today}:${session.venue}`)
        .digest();

      word = WORDS[
        digest.readUInt32BE(0) % WORDS.length
      ];
    }

    return reply({
      ok: true,
      fullName: member.full_name,
      membershipNumber: member.membership_number,
      venueCode: member.venue_code,
      wordOfTheDay: word,
      date: today,
      verifiedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error("VIP card error:", error);

    return reply({
      ok: false,
      error: "Unable to load membership card"
    }, 503);
  }
}
