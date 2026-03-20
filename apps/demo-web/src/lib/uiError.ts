export interface UiError {
  message: string;
  debug?: string;
}

function extractRawMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  return "Unknown error";
}

function normalizeRawMessage(rawMessage: string) {
  try {
    const parsed = JSON.parse(rawMessage);
    if (typeof parsed?.error === "string") {
      return parsed.error;
    }
  } catch {}

  return rawMessage;
}

export function toUiError(error: unknown, context: "token" | "sponsor" | "campaign"): UiError {
  const raw = normalizeRawMessage(extractRawMessage(error));
  const normalized = raw.toLowerCase();

  if (normalized.includes("wallet not connected")) {
    return { message: "Connect a wallet to continue.", debug: raw };
  }

  if (normalized.includes("campaign inactive")) {
    return { message: "This sponsor campaign is outside its active time window.", debug: raw };
  }

  if (normalized.includes("campaign disabled")) {
    return { message: "This sponsor campaign is disabled. Select another one or create a new campaign.", debug: raw };
  }

  if (normalized.includes("campaign budget exhausted") || normalized.includes("budget exceeded")) {
    return { message: "The sponsor budget is exhausted. Create or select another funded campaign.", debug: raw };
  }

  if (normalized.includes("quota exceeded")) {
    return { message: "This wallet already used its sponsor quota for the active campaign.", debug: raw };
  }

  if (normalized.includes("token disabled")) {
    return { message: "This token is not enabled for paymaster settlement.", debug: raw };
  }

  if (normalized.includes("invalid request")) {
    return { message: "Some campaign fields are invalid. Review the form values and try again.", debug: raw };
  }

  if (normalized.includes("next_public_") && normalized.includes("is invalid")) {
    return {
      message: "One of the configured contract addresses is invalid. Remove extra spaces/newlines and verify checksum.",
      debug: raw
    };
  }

  if (normalized.includes("admin key not configured")) {
    return {
      message: "Campaign controls are unavailable because the admin signer is not configured on the API.",
      debug: raw
    };
  }

  if (normalized.includes("invalid target")) {
    return { message: "One of the allowed target addresses is invalid.", debug: raw };
  }

  if (normalized.includes("aa21")) {
    return { message: "Smart account not yet deployed. Send some token first.", debug: raw };
  }

  if (normalized.includes("aa31")) {
    return { message: "Paymaster rejected - check campaign budget or token balance.", debug: raw };
  }

  if (
    normalized.includes("network error")
    || normalized.includes("failed to fetch")
    || normalized.includes("fetch failed")
    || normalized.includes("econnrefused")
    || normalized.includes("timeout")
  ) {
    return { message: "Could not reach the bundler. Is it running?", debug: raw };
  }

  if (context === "token") {
    return { message: "Token mode could not finish. Expand debug details for the original error.", debug: raw };
  }

  if (context === "sponsor") {
    return { message: "Sponsor mode could not finish. Expand debug details for the original error.", debug: raw };
  }

  return { message: "The sponsor console could not complete that action. Expand debug details for the original error.", debug: raw };
}
