import type { AuthDefinition } from "@w6w/types";
import { normalizeBaseUrl, safeErrorMessage } from "../lib/client.ts";
import type { WatiErrorBody } from "../lib/client.ts";

/**
 * Wati's bearer API token — verified against the `authentication` guide page 2026-09-05.
 *
 * Generated from Wati's own UI (Team Inbox → API Docs / Connector → API → Create API Token),
 * optionally scoped to a subset of permissions (`contacts:read`, `contacts:write`,
 * `messagetemplate:read`, …) and optionally given an expiry. Wati documents only this one
 * credential mechanism for the API — there is no OAuth2 flow and no separate Basic auth.
 *
 * The security scheme in Wati's own OpenAPI document is declared `type: "apiKey"`, not
 * `type: "http", scheme: "bearer"` — its `description` field explains why: the token panel
 * expects the caller to type the literal string `Bearer <token>`. `apiKey.prefix` below
 * reproduces that literal wire format, confirmed against the guide's own cURL example.
 */
const apiToken: AuthDefinition = {
  key: "api-token",
  type: "apiKey",
  displayName: "API Token",
  description: "A Wati API token (Team Inbox → API Docs → Create API Token), sent as " +
    "`Authorization: Bearer <token>`.",
  connectionLabel: "{{baseUrl}}",
  apiKey: { in: "header", name: "Authorization", prefix: "Bearer " },
  fields: [
    {
      key: "baseUrl",
      label: "API Endpoint",
      type: "string",
      required: true,
      placeholder: "https://live-mt-server.wati.io/305xxxxxxxx",
      hint: "Your Wati account's own API endpoint, shown on the same API Docs page the token " +
        "comes from. Every Wati customer has their own shard + tenant id in this URL (for " +
        "example `live-mt-server-105.wati.io/<tenantId>`) — there is no shared API host.",
    },
    {
      key: "apiToken",
      label: "API Token",
      type: "secret",
      required: true,
      hint: "Generated in Team Inbox → API Docs → Create API Token. Rotating it every 6 months " +
        "is Wati's own recommendation.",
    },
  ],

  sign({ request, credential }) {
    const { apiToken: token } = credential as { apiToken: string };
    request.headers["authorization"] = `Bearer ${token}`;
    return request;
  },

  /**
   * `GET /api/ext/v3/account/credits` — the narrowest documented V3 read: it takes no
   * parameters, needs no App/board/project id to already exist, and the endpoint's own
   * description states it "returns the caller's own credit balance ... identity is derived
   * from the authenticated tenant context" — i.e. it answers about whichever token calls it,
   * with nothing the caller could get wrong beyond the credential itself. The same call also
   * backs `health/quota.ts` (see that file for why reusing it is deliberate, not duplication).
   *
   * Classified from the response BODY, not the status code: a 401 on this API is documented as
   * frequently bodyless (see `lib/client.ts`), so a non-2xx here reports the vendor's own
   * `{code, message}` text when present and falls back to the raw status otherwise, rather than
   * assuming a JSON error envelope always exists.
   */
  async test({ credential }, ctx) {
    const { apiToken: token, baseUrl } = credential as { apiToken?: string; baseUrl?: string };
    if (!token) return { ok: false, message: "credential missing apiToken" };
    if (!baseUrl) return { ok: false, message: "credential missing baseUrl" };

    let root: string;
    try {
      root = normalizeBaseUrl(baseUrl);
    } catch (err) {
      return { ok: false, message: String((err as Error).message) };
    }

    let res: Response;
    try {
      res = await ctx.fetch(`${root}/api/ext/v3/account/credits`, {
        headers: { authorization: `Bearer ${token}`, accept: "application/json" },
      });
    } catch (err) {
      return { ok: false, message: `could not reach ${root}: ${String(err)}` };
    }

    if (res.status === 200) {
      const body = await res.json().catch(() => null) as { credit?: number } | null;
      return body && typeof body === "object" && "credit" in body
        ? { ok: true }
        : { ok: false, message: "Wati answered 200 with an unexpected body shape" };
    }

    const text = await res.text().catch(() => "");
    const body = parseWatiErrorBody(text);
    const detail = safeErrorMessage(body);
    return {
      ok: false,
      message: detail
        ? `Wati rejected the request: ${detail}`
        : `Wati returned ${res.status}${text ? `: ${text}` : ""}`,
    };
  },

  afterConnect({ credential }) {
    const { baseUrl } = credential as { baseUrl?: string };
    if (!baseUrl) return {};
    try {
      return { baseUrl: normalizeBaseUrl(baseUrl) };
    } catch {
      return { baseUrl };
    }
  },
};

/**
 * Parses a Wati error body but never throws — a non-JSON response (an edge/proxy HTML page, or
 * Wati's documented bodyless 401) must not blow up the `test` hook itself.
 */
function parseWatiErrorBody(text: string): WatiErrorBody | null {
  if (!text) return null;
  try {
    return JSON.parse(text) as WatiErrorBody;
  } catch {
    return null;
  }
}

export default apiToken;
