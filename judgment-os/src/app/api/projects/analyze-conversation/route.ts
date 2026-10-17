import { NextResponse } from "next/server";
import { analyzeConversationInput } from "@/lib/decision-engine/analyze-conversation";
import { getLocale } from "@/lib/locale.server";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { input } = body;

    if (!input || typeof input !== "string") {
      return NextResponse.json(
        { error: "Invalid input" },
        { status: 400 }
      );
    }

    const analysis = await analyzeConversationInput(input, await getLocale());

    return NextResponse.json({ analysis });
  } catch (error) {
    console.error("Conversation analysis error:", error);
    return NextResponse.json(
      { error: "Failed to analyze conversation" },
      { status: 500 }
    );
  }
}
