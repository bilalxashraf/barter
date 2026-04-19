export function isFullAppEnabled() {
  const override = process.env.ENABLE_FULL_APP ?? process.env.NEXT_PUBLIC_ENABLE_FULL_APP;

  if (override === "true") return true;
  if (override === "false") return false;

  return process.env.NODE_ENV !== "production";
}

export function isWaitlistOnlyMode() {
  return !isFullAppEnabled();
}
