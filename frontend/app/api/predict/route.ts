import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const apiBaseUrl = process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!apiBaseUrl) {
    return NextResponse.json(
      { detail: "API_BASE_URL not configured" },
      { status: 500 }
    );
  }

  // Guard: in Vercel, localhost targets won't work
  const isVercel = !!process.env.VERCEL;
  if (isVercel && /^(http:\/\/|https:\/\/)?(localhost|127\.0\.0\.1)/i.test(apiBaseUrl)) {
    return NextResponse.json(
      { detail: "API_BASE_URL points to localhost; deploy a public FastAPI URL or use a tunnel." },
      { status: 500 }
    );
  }

  try {
    const payload = await req.json();
    const upstream = await fetch(`${apiBaseUrl}/predict`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload),
      // Let FastAPI send its own CORS/headers; we just proxy
    });

    const contentType = upstream.headers.get("content-type") || "application/json";
    let body: unknown;
    try {
      body = contentType.includes("application/json") ? await upstream.json() : await upstream.text();
    } catch (_) {
      body = { detail: "Upstream returned invalid response" };
    }

    if (!upstream.ok) {
      return NextResponse.json(
        typeof body === "object" ? (body as any) : { detail: String(body) },
        { status: upstream.status }
      );
    }

    // Mirror success
    return NextResponse.json(body as any, { status: upstream.status });
  } catch (error: any) {
    const message = error?.message || "Proxy error";
    return NextResponse.json({ detail: message }, { status: 500 });
  }
}


