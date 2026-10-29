
import {
  createHmac,
  timingSafeEqual,
  randomUUID
} from "node:crypto";

const APP_ID = "6e5d550d-4ff2-4572-a8b5-82f2bdf2641f";
const APP_URL = "https://oniells-junction-vip.vercel.app/";
const BUCKET = "vip-broadcast-posters";
const MAX_SIZE = 5 * 1024 * 1024;

function reply(data, status = 200) {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store" }
  });
}

function currentAdmin(request, secret) {
  try {
    const item = (request.headers.get("cookie") || "")
      .split(";")
      .map(v => v.trim())
      .find(v => v.startsWith("__Host-vip_admin="));

    const token = item?.slice("__Host-vip_admin=".length);

    if (!token || token.length > 4096) return null;

    const [payload, signature, extra] = token.split(".");

    if (
      extra !== undefined ||
      !payload ||
      !signature ||
      !/^[A-Za-z0-9_-]+$/.test(payload) ||
      !/^[A-Za-z0-9_-]+$/.test(signature)
    ) {
      return null;
    }

    const expected = createHmac("sha256", secret)
      .update("admin." + payload)
      .digest();

    const actual = Buffer.from(signature, "base64url");

    if (
      expected.length !== actual.length ||
      !timingSafeEqual(expected, actual)
    ) {
      return null;
    }

    const session = JSON.parse(
      Buffer.from(payload, "base64url").toString()
    );

    if (
      session.type !== "vip_admin" ||
      !Number.isSafeInteger(session.exp) ||
      session.exp <= Math.floor(Date.now() / 1000) ||
      !/^[0-9a-f-]{36}$/i.test(session.sub || "")
    ) {
      return null;
    }

    return session.sub;

  } catch {
    return null;
  }
}

function detectImageType(bytes) {
  if (
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
    return { mime: "image/jpeg", ext: "jpg" };
  }

  if (
    bytes.length >= 8 &&
    [137,80,78,71,13,10,26,10]
      .every((v, i) => bytes[i] === v)
  ) {
    return { mime: "image/png", ext: "png" };
  }

  if (
    bytes.length >= 12 &&
    bytes.toString("ascii", 0, 4) === "RIFF" &&
    bytes.toString("ascii", 8, 12) === "WEBP"
  ) {
    return { mime: "image/webp", ext: "webp" };
  }

  return null;
}

export async function POST(request) {
  if (
    request.headers.get("origin") !==
    new URL(request.url).origin
  ) {
    return reply({
      ok: false,
      error: "Request not allowed"
    }, 403);
  }

  const url = process.env.SUPABASE_URL
    ?.replace(/\/$/, "");

  const supabaseKey = process.env.SUPABASE_SECRET_KEY;
  const onesignalKey = process.env.ONESIGNAL_REST_API_KEY;
  const sessionKey = process.env.VIP_SESSION_SECRET;

  if (
    !url ||
    !supabaseKey ||
    !onesignalKey ||
    !sessionKey ||
    sessionKey.length < 32
  ) {
    return reply({
      ok: false,
      error: "Server configuration incomplete"
    }, 503);
  }

  const adminId = currentAdmin(request, sessionKey);

  if (!adminId) {
    return reply({
      ok: false,
      error: "Please sign in as administrator"
    }, 401);
  }

  const dbHeaders = {
    apikey: supabaseKey,
    Accept: "application/json"
  };

  try {
    // Verify current admin permissions
    const permission = await fetch(
      `${url}/rest/v1/admin_users` +
      `?user_id=eq.${encodeURIComponent(adminId)}` +
      `&select=role,is_active&limit=1`,
      {
        headers: dbHeaders,
        cache: "no-store"
      }
    );

    if (!permission.ok) {
      throw new Error("Admin lookup failed");
    }

    const [admin] = await permission.json();

    if (
      !admin?.is_active ||
      !["owner", "manager"].includes(admin.role)
    ) {
      return reply({
        ok: false,
        error: "Admin access required"
      }, 403);
    }

    const type = request.headers.get("content-type") || "";

    // UPLOAD A PROMOTIONAL POSTER
    if (type.startsWith("multipart/form-data")) {

      if (
        Number(request.headers.get("content-length") || 0) >
        MAX_SIZE + 250000
      ) {
        return reply({
          ok: false,
          error: "Poster must be under 5 MB"
        }, 413);
      }

      const form = await request.formData();

      if (form.get("action") !== "upload") {
        return reply({
          ok: false,
          error: "Invalid action"
        }, 400);
      }

      const file = form.get("poster");

      if (
        !file ||
        typeof file.arrayBuffer !== "function" ||
        !Number.isFinite(file.size) ||
        file.size < 16 ||
        file.size > MAX_SIZE
      ) {
        return reply({
          ok: false,
          error: "Choose a JPG, PNG or WebP under 5 MB"
        }, 400);
      }

      const bytes = Buffer.from(await file.arrayBuffer());
      const format = detectImageType(bytes);

      if (!format || file.type !== format.mime) {
        return reply({
          ok: false,
          error: "Poster must be a genuine JPG, PNG or WebP"
        }, 400);
      }

      const path = `events/${randomUUID()}.${format.ext}`;

      const uploaded = await fetch(
        `${url}/storage/v1/object/${BUCKET}/${path}`,
        {
          method: "POST",
          headers: {
            apikey: supabaseKey,
            "Content-Type": format.mime,
            "Cache-Control": "3600",
            "x-upsert": "false"
          },
          body: bytes,
          cache: "no-store"
        }
      );

      if (!uploaded.ok) {
        console.error("Poster upload failed", uploaded.status);

        return reply({
          ok: false,
          error: "Poster upload failed"
        }, 502);
      }

      return reply({
        ok: true,
        posterUrl:
          `${url}/storage/v1/object/public/${BUCKET}/${path}`
      });
    }

    // SEND A NOTIFICATION
    if (!type.startsWith("application/json")) {
      return reply({
        ok: false,
        error: "Unsupported request format"
      }, 415);
    }

    const raw = await request.text();

    if (raw.length > 5000) {
      return reply({
        ok: false,
        error: "Request too large"
      }, 413);
    }

    const data = JSON.parse(raw);

    if (
      data?.action !== "send" ||
      !["test", "live"].includes(data.mode) ||
      !["ON", "JR", "both"].includes(data.venueCode)
    ) {
      return reply({
        ok: false,
        error: "Invalid broadcast options"
      }, 400);
    }

    const title = typeof data.title === "string"
      ? data.title.trim()
      : "";

    const message = typeof data.message === "string"
      ? data.message.trim()
      : "";

    if (
      title.length < 3 ||
      title.length > 100 ||
      message.length < 3 ||
      message.length > 250
    ) {
      return reply({
        ok: false,
        error: "Title or message length is invalid"
      }, 400);
    }

    // Only permit images from our own poster bucket
    let posterUrl = null;

    if (data.posterUrl) {
      if (
        typeof data.posterUrl !== "string" ||
        !data.posterUrl.startsWith(
          `${url}/storage/v1/object/public/${BUCKET}/events/`
        ) ||
        !/\/[0-9a-f-]{36}\.(jpg|png|webp)$/i
          .test(data.posterUrl)
      ) {
        return reply({
          ok: false,
          error: "Upload the poster first"
        }, 400);
      }

      posterUrl = data.posterUrl;
    }

    const notification = {
      app_id: APP_ID,
      target_channel: "push",

      idempotency_key:
        typeof data.sendId === "string" &&
        /^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i
          .test(data.sendId)
          ? data.sendId
          : randomUUID(),

      name: `VIP ${data.mode} ${data.venueCode}: ${title}`,
      headings: { en: title },
      contents: { en: message },
      url: APP_URL
    };

    if (posterUrl) {
      notification.global_image = posterUrl;
      notification.chrome_web_image = posterUrl;
      notification.big_picture = posterUrl;
    }

    // TEST: One specific subscribed device
    if (data.mode === "test") {
      const id = String(
        data.testSubscriptionId || ""
      ).trim();

      if (
        !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i
          .test(id)
      ) {
        return reply({
          ok: false,
          error: "Enter your OneSignal test Subscription ID"
        }, 400);
      }

      notification.include_subscription_ids = [id];

    } else {
      // LIVE: Only matching venue-tagged subscribers
      if (data.confirm !== "SEND") {
        return reply({
          ok: false,
          error: "Confirm the live send"
        }, 400);
      }

      const filter = venue => ({
        field: "tag",
        key: "vip_venue",
        relation: "=",
        value: venue
      });

      notification.filters = data.venueCode === "both"
        ? [
            filter("ON"),
            { operator: "OR" },
            filter("JR")
          ]
        : [filter(data.venueCode)];
    }

    // Send through OneSignal
    const sent = await fetch(
      "https://api.onesignal.com/notifications",
      {
        method: "POST",
        headers: {
          Authorization: `Key ${onesignalKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(notification),
        cache: "no-store"
      }
    );

    const result = await sent.json().catch(() => ({}));

    if (!sent.ok || !result.id) {
      console.error(
        "OneSignal rejected broadcast",
        sent.status,
        result.errors
      );

      return reply({
        ok: false,
        error: "OneSignal did not accept this broadcast"
      }, 502);
    }

    // Record successful submission in Supabase
    const history = await fetch(
      `${url}/rest/v1/broadcasts`,
      {
        method: "POST",
        headers: {
          ...dbHeaders,
          "Content-Type": "application/json",
          Prefer: "return=minimal"
        },
        body: JSON.stringify({
          title,
          message,
          venue_code: data.venueCode,
          poster_url: posterUrl,
          onesignal_id: result.id,
          sent_by: adminId,
          is_test: data.mode === "test",
          status: "sent",
          sent_at: new Date().toISOString()
        }),
        cache: "no-store"
      }
    );

    if (!history.ok) {
      console.error(
        "Broadcast sent but history save failed",
        history.status
      );
    }

    return reply({
      ok: true,
      id: result.id,
      mode: data.mode,
      historySaved: history.ok,
      recipients: result.recipients ?? null
    });

  } catch (error) {
    console.error("VIP broadcast error", error);

    return reply({
      ok: false,
      error: "Broadcast service error. Check Vercel logs."
    }, 503);
  }
}
