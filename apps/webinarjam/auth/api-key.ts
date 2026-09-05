import type { AuthDefinition } from "@w6w/types";
import {
  BASE_URL,
  encodeForm,
  formatWebinarJamError,
  type WebinarJamEnvelope,
} from "../lib/client.ts";

/**
 * WebinarJam / EverWebinar API key — an `api_key` form field, never a header.
 *
 * ## Getting one is not self-serve
 *
 * Unlike almost every other Auth method in this pack, there is no "paste your
 * key" moment reachable on demand. Per the vendor's own "Apply for an API key"
 * article: API access requires **manually applying** (account Profile > API),
 * is **paid-plan only**, and is **approved by the vendor, typically within two
 * business days**. Once approved, the one key is **account-wide and shared
 * across both WebinarJam and EverWebinar** — "Only one set of API keys is
 * generated per account" — and it can be regenerated at most once per hour.
 * `description` below states this rather than letting a user discover it after
 * failing to find a self-serve key page.
 *
 * ## Where the credential goes
 *
 * Every request is `POST … application/x-www-form-urlencoded` with `api_key`
 * as one of the form fields — confirmed by every one of the docs' own curl
 * examples (`curl --data "api_key=demokey" …`). `sign` therefore rewrites the
 * request BODY, not a header, mirroring `../../pushover/auth/app-token.ts`'s
 * body-carried-credential shape.
 *
 * ## The probe, and why not something with a required id
 *
 * `POST /webinarjam/webinars` — "list all webinars" — takes `api_key` and
 * nothing else, so it is reachable from a fresh connection with zero prior
 * state. The one other zero-parameter-besides-`api_key` endpoint in this API
 * is the same call under `/everwebinar/webinars`; since a single key covers
 * both products, probing one confirms the credential for both, and the
 * WebinarJam path is used because it is the account's originally-provisioned
 * product per the docs' own onboarding flow.
 *
 * ## Classifying failure from the BODY, confirmed live
 *
 * Neither Help Center article for this API ever shows a failure response —
 * only `lib/client.ts`'s live probes did. Both the "no api_key sent" (400) and
 * "well-formed but wrong api_key" (401) cases return the SAME envelope shape,
 * `{"status":"error","errors":{"api_key": string | string[]}}`, with no
 * credential material in the body — so `test` reads `errors.api_key` rather
 * than trusting the HTTP status code alone.
 */

export interface WebinarJamCredential {
  apiKey: string;
}

/** Pinned so the probe is asserted rather than merely exercised. See module doc for why this one. */
export const PROBE_PATH = "/webinarjam/webinars";

/** The one place the credential is merged into a form body — `sign` and `test` share it. */
export function mergeApiKey(encodedBody: string, apiKey: string): string {
  const params = new URLSearchParams(encodedBody);
  params.set("api_key", apiKey);
  return params.toString();
}

/** One field's error, normalising the bare-string-vs-array inconsistency observed live. */
function fieldMessage(errors: WebinarJamEnvelope["errors"], field: string): string | undefined {
  const value = errors?.[field];
  if (Array.isArray(value)) return value.join("; ");
  return value;
}

const apiKey: AuthDefinition = {
  key: "api-key",
  type: "custom",
  displayName: "API Key",
  description:
    "WebinarJam/EverWebinar API access must be applied for first (account Profile > API tab; " +
    "paid plans only, ~2 business days for approval) before a key exists. Once approved, one key " +
    "works for both WebinarJam and EverWebinar — only one is issued per account.",
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "From any webinar's Advanced link > API custom integration in your dashboard. " +
        "Account-wide — the same key regardless of which webinar you opened it from.",
    },
  ],

  /**
   * The only hook handed the raw credential, and it runs network-less: it
   * merges `api_key` into whatever form body the action already built and
   * re-encodes. The credential never appears in a header or the URL.
   */
  sign({ request, credential }) {
    const cred = credential as Partial<WebinarJamCredential>;
    request.body = mergeApiKey(request.body ?? "", cred.apiKey ?? "");
    request.headers["content-type"] = "application/x-www-form-urlencoded";
    return request;
  },

  async test({ credential }, ctx) {
    const cred = credential as Partial<WebinarJamCredential>;
    const key = (cred?.apiKey ?? "").trim();
    if (!key) return { ok: false, message: "credential missing apiKey" };

    const res = await ctx.fetch(`${BASE_URL}${PROBE_PATH}`, {
      method: "POST",
      headers: { accept: "application/json", "content-type": "application/x-www-form-urlencoded" },
      body: encodeForm({ api_key: key }),
    });

    const text = await res.text();
    let body: WebinarJamEnvelope | null = null;
    try {
      body = text ? JSON.parse(text) as WebinarJamEnvelope : null;
    } catch { /* not JSON */ }

    if (res.ok && body?.status === "success") return { ok: true };

    const apiKeyMessage = fieldMessage(body?.errors, "api_key");
    if (apiKeyMessage) {
      return {
        ok: false,
        message: `WebinarJam rejected the API key (${res.status}): ${apiKeyMessage}`,
      };
    }
    if (body) {
      return { ok: false, message: formatWebinarJamError(res.status, PROBE_PATH, body, text) };
    }
    return { ok: false, message: `WebinarJam returned HTTP ${res.status} with an unreadable body` };
  },
};

export default apiKey;
