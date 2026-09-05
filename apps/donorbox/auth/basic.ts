import type { AuthDefinition } from "@w6w/types";
import { API_BASE, API_PREFIX, basicHeader, formatDonorboxError } from "../lib/client.ts";

/**
 * HTTP Basic — "Donorbox API uses basic authentication as our authorization
 * method. Use your organization login email as your authorization username
 * and the API Key as your password." Verified against the vendor's own
 * README (`donorbox/donorbox-api`, "Make API calls to Donorbox" section).
 *
 * There is exactly one auth scheme documented; no OAuth surface exists.
 * Access to the API itself costs $17/month, billed by Donorbox separately
 * from the platform subscription — see `README.md`.
 *
 * ## The probe
 *
 * `GET /api/v1/campaigns?per_page=1` — the cheapest documented read, bounded
 * to one record. It requires a live credential and returns nothing beyond
 * the connecting organization's own campaign metadata (name, goal, totals) —
 * never anything that could be mistaken for the credential itself.
 *
 * ## Classify from the body, not the bare status
 *
 * A live probe with a garbage credential answers `401` with
 * `{"error":"Authentication failed"}` — a flat string, not a nested object
 * (see `lib/client.ts`). `test` reads that message rather than trusting the
 * status code alone, since Donorbox uses 401 for exactly one documented
 * condition (bad Basic credential) but a body-only classification is
 * unaffected if that ever changes.
 */

export interface DonorboxCredential {
  email: string;
  apiKey: string;
}

const basic: AuthDefinition = {
  key: "basic",
  type: "basic",
  displayName: "API Key",
  description:
    "Your Donorbox organization login email plus the API key from Account > API & Zapier " +
    "Integration > Set new API Key. Donorbox charges $17/month for API access, separate from " +
    "your platform plan.",
  connectionLabel: "{{email}}",
  fields: [
    {
      key: "email",
      label: "Login email",
      type: "string",
      required: true,
      hint: "The email address you use to log in to your Donorbox organization.",
    },
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "Account > API & Zapier Integration > Set new API Key. Shown only once — store it " +
        "securely.",
    },
  ],

  /**
   * The only hook handed the raw credential, and it runs network-less: it
   * stamps the Basic header and returns.
   */
  sign({ request, credential }) {
    const cred = credential as Partial<DonorboxCredential>;
    request.headers["authorization"] = basicHeader(cred.email ?? "", cred.apiKey ?? "");
    return request;
  },

  async test({ credential }, ctx) {
    const cred = credential as Partial<DonorboxCredential>;
    const email = (cred.email ?? "").trim();
    const apiKey = (cred.apiKey ?? "").trim();
    if (!email || !apiKey) {
      return { ok: false, message: "credential missing email or apiKey" };
    }

    const url = `${API_BASE}${API_PREFIX}/campaigns?per_page=1`;
    const res = await ctx.fetch(url, {
      headers: { accept: "application/json", authorization: basicHeader(email, apiKey) },
    });
    if (res.ok) return { ok: true };

    const raw = await res.text().catch(() => "");
    if (res.status === 401) {
      const parsed = (() => {
        try {
          return JSON.parse(raw) as { error?: string };
        } catch {
          return null;
        }
      })();
      return {
        ok: false,
        message:
          `Donorbox rejected the credential (401${
            parsed?.error ? ` ${parsed.error}` : ""
          }). Check the login email and API key were copied exactly, and that API access is ` +
          "still enabled ($17/month, billed separately) on the Donorbox account.",
      };
    }
    return { ok: false, message: formatDonorboxError(res.status, "GET", "/api/v1/campaigns", raw) };
  },
};

export default basic;
