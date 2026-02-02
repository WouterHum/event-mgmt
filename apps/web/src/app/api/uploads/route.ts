import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();

    const backendRes = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL}/uploads`,
      {
        method: "POST",
        body: formData,
      }
    );

    const data = await backendRes.json();
    return NextResponse.json(data, { status: backendRes.status });
  } catch (err) {
    console.error("Proxy upload error:", err);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
