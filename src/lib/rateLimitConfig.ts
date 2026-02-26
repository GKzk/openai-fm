export const RATE_LIMITS = {
  generation: { limit: 20, window: "day" },
  download: { limit: 10, window: "week" },
} as const;

export type RateLimitType = keyof typeof RATE_LIMITS;
export type RateLimitWindow = (typeof RATE_LIMITS)[RateLimitType]["window"];

export interface RateLimitStatus {
  type: RateLimitType;
  allowed: boolean;
  limit: number;
  window: RateLimitWindow;
  remaining: number;
  resetAt: string;
}
