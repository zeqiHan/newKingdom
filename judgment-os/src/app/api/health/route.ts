import { NextResponse } from "next/server";

/** Lightweight health check for deploy platforms. */
export async function GET() {
  return NextResponse.json({
    ok: true,
    service: "judgment-os",
    time: new Date().toISOString(),
  });
}
