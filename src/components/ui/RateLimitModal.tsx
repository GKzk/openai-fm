import * as React from "react";
import { Dialog } from "radix-ui";
import {
  RATE_LIMITS,
  RateLimitStatus,
  RateLimitType,
} from "@/lib/rateLimitConfig";

const RateLimitModal = ({
  open,
  onOpenChange,
  status,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  status: RateLimitStatus | null;
}) => {
  const fallbackType: RateLimitType = status?.type ?? "generation";
  const limit = status?.limit ?? RATE_LIMITS[fallbackType].limit;
  const label = fallbackType === "download" ? "downloads" : "generations";
  const windowLabel =
    (status?.window ?? RATE_LIMITS[fallbackType].window) === "week"
      ? "week"
      : "day";
  const resetText = status?.resetAt
    ? new Date(status.resetAt).toLocaleString()
    : "later";

  return (
    <Dialog.Root onOpenChange={onOpenChange} open={open}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/30 data-[state=open]:animate-overlayShow z-100" />
        <Dialog.Content className="z-100 fixed bg-white left-1/2 top-1/2 max-h-[85vh] w-[90vw] max-w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-md bg-gray1 p-[25px] shadow-[var(--shadow-6)] focus:outline-none data-[state=open]:animate-contentShow">
          <Dialog.Title className="m-0 text-[17px] font-medium text-mauve12">
            Rate limit reached
          </Dialog.Title>
          <Dialog.Description className="mb-5 mt-2.5 text-[15px] leading-normal text-mauve11">
            You&apos;ve reached the limit of {limit} {label} per {windowLabel}{" "}
            per IP address. Please try again after {resetText}.
          </Dialog.Description>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};

export default RateLimitModal;
