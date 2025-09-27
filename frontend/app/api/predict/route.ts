import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const apiBaseUrl = process.env.API_BASE_URL || process.env.NEXT_PUBLIC_API_BASE_URL;
  if (!apiBaseUrl) {
    return NextResponse.json(
      { detail: "API_BASE_URL not configured" },
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
    const body = contentType.includes("application/json")
      ? await upstream.json()
      : await upstream.text();

    // Mirror status from upstream
    return NextResponse.json(body as any, { status: upstream.status });
  } catch (error) {
    return NextResponse.json({ detail: "Proxy error" }, { status: 500 });
  }
}


