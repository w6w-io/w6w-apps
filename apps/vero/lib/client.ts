import type { HookContext } from "@w6w/types";

/**
 * Vero's Track API — the write side of customer data: identify/delete a
 * user, track an event, edit tags, alias (reidentify) a user, and globally
 * resubscribe/unsubscribe them. Verified 2026-09-01 against the OpenAPI
 * schema embedded in Vero's own docs (help.getvero.com/api-reference/*,
 * `originalFileLocation: "api-reference/track/track.yml"`) and confirmed
 * live: an unauthenticated `POST /users/track` answers
 * `401 {"status":401,"message":"Invalid authentication: You must provide a
 * valid auth_token to access this resource."}`.
 *
 * Base URL is fixed — Vero runs a single API host with no regional split
 * (unlike, e.g., Customer.io's US/EU Track API hosts).
 */
export const API_BASE = "https://api.getvero.com/api/v2";

/**
 * A `type: "json"` param arrives already parsed as an object in the reference
 * runtime, but some hosts pass it through as a raw JSON string — accept both.
 */
export function parseJsonParam(value: unknown): Record<string, unknown> | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  if (typeof value === "object") return value as Record<string, unknown>;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    const parsed = JSON.parse(trimmed);
    if (typeof parsed !== "object" || parsed === null) throw new Error("expected a JSON object");
    return parsed as Record<string, unknown>;
  }
  throw new Error("expected a JSON object");
}

/** Drop keys the caller left unset so a request doesn't send empty/null fields. */
export function compact(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v !== undefined && v !== null && v !== "") out[k] = v;
  }
  return out;
}

/**
 * Every Track API response — success or error — is `{ status, message }`
 * (confirmed live and in every documented `200`/`400`/`401`/`404`/`500`
 * example). Falls back to raw text when the body isn't that shape.
 */
async function readBody(res: Response): Promise<{ status?: number; message?: string } | null> {
  const text = await res.text().catch(() => "");
  if (!text) return null;
  try {
    return JSON.parse(text) as { status?: number; message?: string };
  } catch {
    return { message: text };
  }
}

/** One Track API call. Throws with Vero's own `message` on a non-2xx response. */
export async function request(
  ctx: HookContext,
  method: "POST" | "PUT",
  path: string,
  body: Record<string, unknown>,
): Promise<{ success: boolean; message?: string }> {
  const res = await ctx.fetch(`${API_BASE}${path}`, {
    method,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const parsed = await readBody(res);
  if (!res.ok) {
    throw new Error(
      `Vero ${res.status} ${res.statusText} for ${method} ${path}: ${
        parsed?.message ?? "unknown error"
      }`,
    );
  }
  return { success: true, message: parsed?.message };
}
