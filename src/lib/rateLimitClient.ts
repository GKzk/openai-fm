import { appStore } from "@/lib/store";
import { RATE_LIMITS, RateLimitStatus, RateLimitType } from "./rateLimitConfig";

const openRateLimitModal = (status: RateLimitStatus) => {
  appStore.setState((draft) => {
    draft.rateLimitOpen = true;
    draft.rateLimitStatus = status;
  });
};

export const checkRateLimit = async (type: RateLimitType) => {
  try {
    const res = await fetch(`/api/limit?type=${type}`);
    if (!res.ok) {
      return true;
    }
    const status = (await res.json()) as RateLimitStatus;
    if (!status.allowed) {
      openRateLimitModal(status);
      return false;
    }
  } catch (err) {
    console.error("Error checking rate limit:", err);
  }
  return true;
};

export const handleRateLimitResponse = async (
  res: Response,
  type: RateLimitType
) => {
  if (res.status !== 429) {
    return false;
  }
  try {
    const status = (await res.json()) as RateLimitStatus;
    openRateLimitModal(status);
  } catch (err) {
    console.error("Error reading rate limit response:", err);
    openRateLimitModal({
      type,
      allowed: false,
      limit: RATE_LIMITS[type].limit,
      window: RATE_LIMITS[type].window,
      remaining: 0,
      resetAt: new Date().toISOString(),
    });
  }
  return true;
};

export const consumeDownloadLimit = async () => {
  try {
    const res = await fetch("/api/limit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: "download" }),
    });
    if (await handleRateLimitResponse(res, "download")) {
      return false;
    }
    return res.ok;
  } catch (err) {
    console.error("Error updating download limit:", err);
    return true;
  }
};
