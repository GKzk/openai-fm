import { NextRequest } from "next/server";
import { checkRateLimit } from "@/lib/rateLimit";
import { RateLimitType } from "@/lib/rateLimitConfig";

const getType = (value: string | null): RateLimitType =>
  value === "download" ? "download" : "generation";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = getType(searchParams.get("type"));
    const status = await checkRateLimit(req, type, { increment: false });
    return Response.json({ ...status, type });
  } catch (err) {
    console.error("Error checking rate limit:", err);
    return new Response("Error checking rate limit.", { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const { type: typeValue } = await req.json();
    const type = getType(typeValue ?? null);
    const status = await checkRateLimit(req, type);
    if (!status.allowed) {
      return Response.json(
        {
          error: "rate_limit",
          ...status,
          type,
        },
        { status: 429 }
      );
    }
    return Response.json({ ...status, type });
  } catch (err) {
    console.error("Error incrementing rate limit:", err);
    return new Response("Error updating rate limit.", { status: 500 });
  }
}
