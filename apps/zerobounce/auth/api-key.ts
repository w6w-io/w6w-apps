import type { AuthDefinition } from "@w6w/types";
import { HOSTS } from "../lib/client.ts";

/**
 * ZeroBounce API Key.
 *
 * Minted in the dashboard (Account → API section) and travels two different
 * ways depending on the endpoint's verb — see `lib/client.ts`'s module doc
 * for the full finding. `apiKey: { in: "query", name: "api_key" }` records
 * the common (GET) case declaratively for `describe()`/UI purposes, exactly
 * like every other Auth method in this pack; the runtime never auto-signs
 * from that metadata, so `sign` below does the real work and additionally
 * covers the JSON-body case `POST /v2/validatebatch` requires.
 *
 * ## The probe: `GET /v2/getcredits`
 *
 * Chosen because:
 *   - It never echoes the API key back — the entire response is
 *     `{"Credits": <number>}` (or `{"Credits": -1}` on failure). Compare with
 *     traps this pack has hit before (Mailjet's `/apikey`, Follow Up Boss's
 *     `/me`), where the "whoami" IS the credential.
 *   - It costs nothing: the docs describe it purely as a balance read, never
 *     mentioned alongside billable operations.
 *   - It is reachable on every plan, with no scope this app's single Auth
 *     method could plausibly lack.
 *
 * Liveness is read from the body's `Credits` field, never the HTTP status
 * alone (the docs never state one for the failure case — see `lib/client.ts`):
 * `-1` means "your API Key is invalid" verbatim per the docs; any other
 * number means the key is live, however small.
 */
const apiKey: AuthDefinition = {
  key: "api-key",
  type: "apiKey",
  displayName: "API Key",
  description:
    "Paste an API key from your ZeroBounce dashboard's API section. Sent as the `api_key` " +
    "query parameter on GET requests, or as an `api_key` field in the JSON body for the batch " +
    "validate endpoint, which accepts no query-string form.",
  apiKey: { in: "query", name: "api_key" },
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "zerobounce.net → your account → API section.",
    },
  ],

  sign({ request, credential }) {
    const { apiKey } = credential as { apiKey: string };
    if (request.body) {
      // POST /v2/validatebatch (and any future JSON-body endpoint): the key
      // is a field inside the body, not a query parameter — see the module
      // doc in `lib/client.ts`.
      let payload: Record<string, unknown> = {};
      try {
        payload = JSON.parse(request.body) as Record<string, unknown>;
      } catch {
        payload = {};
      }
      payload.api_key = apiKey;
      request.body = JSON.stringify(payload);
      request.headers["content-type"] = "application/json";
      return request;
    }
    const url = new URL(request.url);
    url.searchParams.set("api_key", apiKey);
    request.url = url.toString();
    return request;
  },

  async test({ credential }, ctx) {
    const { apiKey } = credential as { apiKey?: string };
    if (!apiKey) return { ok: false, message: "credential missing apiKey" };

    const url = new URL(`https://${HOSTS.default}/v2/getcredits`);
    url.searchParams.set("api_key", apiKey);
    const res = await ctx.fetch(url.toString(), { headers: { accept: "application/json" } });
    const text = await res.text();

    let body: { Credits?: number } | null = null;
    try {
      body = JSON.parse(text) as { Credits?: number };
    } catch {
      // Not JSON — fall through to the status-based message below.
    }

    if (body && typeof body.Credits === "number") {
      if (body.Credits === -1) {
        return { ok: false, message: "ZeroBounce reports Credits: -1 — invalid API key" };
      }
      return { ok: true };
    }
    return { ok: false, message: `ZeroBounce returned ${res.status}: ${text || res.statusText}` };
  },
};

export default apiKey;
