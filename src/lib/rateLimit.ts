import { sql } from "@vercel/postgres";
import { RATE_LIMITS, RateLimitType } from "./rateLimitConfig";
import type { NextRequest } from "next/server";

let tableReady = false;

const ensureTable = async () => {
  if (tableReady) return;
  await sql`
    CREATE TABLE IF NOT EXISTS rate_limits (
      ip TEXT NOT NULL,
      bucket TEXT NOT NULL,
      count INTEGER NOT NULL DEFAULT 0,
      reset_at TIMESTAMPTZ NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      PRIMARY KEY (ip, bucket)
    );
  `;
  tableReady = true;
};

const getClientIp = (req: NextRequest) => {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = req.headers.get("x-real-ip");
  if (realIp) return realIp.trim();
  return req.ip ?? "0.0.0.0";
};

const getWindow = (type: RateLimitType, now = new Date()) => {
  if (type === "generation") {
    const start = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
    );
    const resetAt = new Date(start);
    resetAt.setUTCDate(resetAt.getUTCDate() + 1);
    return { start, resetAt };
  }

  const weekStart = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );
  const day = weekStart.getUTCDay();
  const daysSinceMonday = (day + 6) % 7;
  weekStart.setUTCDate(weekStart.getUTCDate() - daysSinceMonday);
  const resetAt = new Date(weekStart);
  resetAt.setUTCDate(resetAt.getUTCDate() + 7);
  return { start: weekStart, resetAt };
};

const getBucketKey = (type: RateLimitType, start: Date) =>
  `${type}:${start.toISOString().slice(0, 10)}`;

export const checkRateLimit = async (
  req: NextRequest,
  type: RateLimitType,
  options?: { increment?: boolean }
) => {
  const increment = options?.increment !== false;
  if (!process.env.POSTGRES_URL) {
    return {
      allowed: true,
      limit: RATE_LIMITS[type].limit,
      window: RATE_LIMITS[type].window,
      remaining: RATE_LIMITS[type].limit,
      resetAt: new Date().toISOString(),
      ip: getClientIp(req),
      disabled: true,
    };
  }

  await ensureTable();

  const { limit, window } = RATE_LIMITS[type];
  const { start, resetAt } = getWindow(type);
  const bucketKey = getBucketKey(type, start);
  const ip = getClientIp(req);

  if (!increment) {
    const { rows } = await sql<{
      count: number;
      reset_at: Date;
    }>`
      SELECT count, reset_at
      FROM rate_limits
      WHERE ip = ${ip} AND bucket = ${bucketKey};
    `;

    const count = rows[0]?.count ?? 0;
    const resetAtValue = rows[0]?.reset_at
      ? new Date(rows[0].reset_at)
      : resetAt;

    return {
      allowed: count < limit,
      limit,
      window,
      remaining: Math.max(0, limit - count),
      resetAt: resetAtValue.toISOString(),
      ip,
    };
  }

  const { rows } = await sql<{
    count: number;
  }>`
    INSERT INTO rate_limits (ip, bucket, count, reset_at)
    VALUES (${ip}, ${bucketKey}, 1, ${resetAt.toISOString()})
    ON CONFLICT (ip, bucket)
    DO UPDATE SET count = rate_limits.count + 1,
                  reset_at = EXCLUDED.reset_at,
                  updated_at = NOW()
    RETURNING count;
  `;

  const count = rows[0]?.count ?? 1;

  return {
    allowed: count <= limit,
    limit,
    window,
    remaining: Math.max(0, limit - count),
    resetAt: resetAt.toISOString(),
    ip,
  };
};
