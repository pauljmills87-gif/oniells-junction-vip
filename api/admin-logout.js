
export async function POST(request) {
  const origin = request.headers.get("origin");

  if (
    origin &&
    origin !== new URL(request.url).origin
  ) {
    return Response.json(
      { ok: false },
      { status: 403 }
    );
  }

  return Response.json(
    { ok: true },
    {
      headers: {
        "Cache-Control": "no-store",
        "Set-Cookie":
          "__Host-vip_admin=; Path=/; HttpOnly; " +
          "Secure; SameSite=Strict; Max-Age=0"
      }
    }
  );
}
