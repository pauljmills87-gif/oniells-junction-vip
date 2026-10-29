
export async function POST(request) {
  const origin = request.headers.get("origin");

  if (origin && origin !== new URL(request.url).origin) {
    return Response.json(
      { ok: false, error: "Request not allowed" },
      { status: 403 }
    );
  }

  return Response.json(
    { ok: true },
    {
      headers: {
        "Cache-Control": "no-store",
        "Set-Cookie":
          "__Host-vip_session=; Path=/; " +
          "HttpOnly; Secure; SameSite=Lax; Max-Age=0"
      }
    }
  );
}
