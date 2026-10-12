/** Stable errors from public.f50_activate_invitation, with safe client messages. */
export type Founding50ActivationErrorCode =
  | "F50_AUTH_REQUIRED"
  | "F50_INVITE_INVALID"
  | "F50_INVITE_NOT_FOUND"
  | "F50_NOT_INVITED"
  | "F50_INVITE_EXPIRED"
  | "F50_EMAIL_MISMATCH"
  | "F50_ALREADY_ACTIVATED"
  | "F50_ACCOUNT_ALREADY_LINKED"
  | "F50_ENTITLEMENT_CONFLICT"
  | "F50_SEATS_FULL"
  | "F50_BACKEND_NOT_READY"
  | "F50_ACTIVATION_FAILED";

const errorDetails: Record<Founding50ActivationErrorCode, { status: number; message: string }> = {
  F50_AUTH_REQUIRED: { status: 401, message: "Please sign in with your verified parent account." },
  F50_INVITE_INVALID: { status: 400, message: "This invitation link is invalid. Please open the most recent invitation email." },
  F50_INVITE_NOT_FOUND: { status: 409, message: "This invitation is no longer available. It may have expired or been replaced. Please contact Dreamscape for a fresh invitation." },
  F50_NOT_INVITED: { status: 409, message: "This application is not currently invited. Please contact Dreamscape support." },
  F50_INVITE_EXPIRED: { status: 410, message: "Your seven-day invitation has expired. Please request a new invitation." },
  F50_EMAIL_MISMATCH: { status: 403, message: "Please sign in with the same verified parent email address used for the application." },
  F50_ALREADY_ACTIVATED: { status: 409, message: "This invitation has already been activated. Please sign in to view your beta benefits." },
  F50_ACCOUNT_ALREADY_LINKED: { status: 409, message: "This account is already linked to another Founding 50 application." },
  F50_ENTITLEMENT_CONFLICT: { status: 409, message: "A previous Founding 50 entitlement already exists for this account. Please contact support." },
  F50_SEATS_FULL: { status: 409, message: "All 50 Founding 50 places are allocated. Please contact Dreamscape." },
  F50_BACKEND_NOT_READY: { status: 503, message: "Beta activation is temporarily unavailable. Please contact Dreamscape support." },
  F50_ACTIVATION_FAILED: { status: 500, message: "Unable to activate at the moment. Please try again, or contact Dreamscape support." },
};

export function classifyActivationError(error: { message?: string; code?: string } | null | undefined) {
  const matched = String(error?.message || "").match(/\bF50_[A-Z_]+\b/);
  const code = matched && Object.prototype.hasOwnProperty.call(errorDetails, matched[0])
    ? matched[0] as Founding50ActivationErrorCode
    : (error?.code === "42883" || error?.code === "42P01" || error?.code === "PGRST202" || error?.code === "PGRST205")
      ? "F50_BACKEND_NOT_READY" : "F50_ACTIVATION_FAILED";
  return { code, ...errorDetails[code] };
}
