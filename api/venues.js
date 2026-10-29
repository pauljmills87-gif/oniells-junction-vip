
export async function GET() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;

  if (!url || !key) {
    return Response.json(
      { ok: false, error: "Server configuration missing" },
      { status: 500 }
    );
  }

  try {
    const response = await fetch(
      `${url.replace(/\/$/, "")}/rest/v1/venues?select=code,name,slug&order=code.asc`,
      {
        headers: {
          apikey: key,
          Accept: "application/json"
        },
        cache: "no-store"
      }
    );

    if (!response.ok) {
      console.error("Supabase connection failed:", response.status);

      return Response.json(
        { ok: false, error: "Database connection failed" },
        { status: 502 }
      );
    }

    const venues = await response.json();

    return Response.json(
      { ok: true, venues },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Database request failed:", error);

    return Response.json(
      { ok: false, error: "Unable to contact database" },
      { status: 502 }
    );
  }
}
