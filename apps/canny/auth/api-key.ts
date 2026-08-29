import type { AuthDefinition } from "@w6w/types";
import { API_BASE, type CannyErrorBody } from "../lib/client.ts";

/**
 * API Key (`apiKey`, body-located) — the only auth Canny supports.
 *
 * Canny's own docs (Authentication section, `developers.canny.io/api-reference`,
 * verified 2026-08-29): "API requests must be authenticated by including your
 * secret API key... You can include your secret API key in a request by
 * adding it as a POST parameter with key apiKey." There is no header form and
 * no OAuth surface for third-party integrations — one secret, workspace-wide
 * key found in Company Settings > API is the whole authentication story, and
 * (unlike Apify) Canny documents no scoping: the key can read and write
 * everything in the workspace.
 *
 * ## Why this needs special handling
 *
 * A JSON-body key has nowhere to go in `SignableRequest.headers` — it has to
 * be merged into `SignableRequest.body`, which is a plain `string | null` (the
 * wire bytes, not a parsed structure — see `@w6w/types` `hooks.ts`). So `sign`
 * parses the action's already-built JSON body (or `{}` when the action sends
 * no fields of its own), sets `apiKey` on top of whatever the action already
 * put there (actions never set it themselves), and re-serializes. This is the
 * same shape Mandrill's auth uses for the identical problem
 * (`../../mandrill/auth/api-key.ts`) — a body-located credential is not a
 * one-off case in this pack.
 *
 * `apiKey: { in: "body", name: "apiKey" }` records that location declaratively
 * for `describe()`/UI purposes; the runtime never auto-signs from it, so
 * `sign` below does the actual work by hand, exactly as every other Auth
 * method in this pack does regardless of `in`.
 */

export interface CannyCredential {
  apiKey: string;
}

const apiKey: AuthDefinition = {
  key: "api-key",
  type: "apiKey",
  displayName: "API Key",
  description:
    "Paste your secret API key from Canny > Settings > API. It is workspace-wide — there is no " +
    "per-key scoping — so treat it like an admin credential.",
  apiKey: { in: "body", name: "apiKey" },
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "Canny admin console > Settings > API. Sent as an `apiKey` field in the JSON body of " +
        "every request — Canny has no header-based auth.",
    },
  ],

  /**
   * The only hook handed the raw credential, and it runs network-less: it
   * merges `apiKey` into the JSON body the action already built and returns.
   * The credential never touches a header or a URL.
   */
  sign({ request, credential }) {
    const { apiKey } = credential as Partial<CannyCredential>;
    let payload: Record<string, unknown> = {};
    if (request.body) {
      try {
        payload = JSON.parse(request.body) as Record<string, unknown>;
      } catch {
        payload = {};
      }
    }
    payload.apiKey = apiKey ?? "";
    request.body = JSON.stringify(payload);
    request.headers["content-type"] = "application/json";
    return request;
  },

  /**
   * The credential-liveness probe.
   *
   * `POST /v1/boards/list` was chosen because Canny's API has no scoped-token
   * concept and no dedicated ping/whoami endpoint — every key can read and
   * write the whole workspace, so there is no "narrower" option to prefer the
   * way Apify's scoped tokens require. Boards are non-secret metadata (id,
   * name, post count, url) and every Canny workspace has at least a default
   * board, so this both requires a live credential and returns nothing a
   * probe shouldn't echo.
   *
   * Live-verified 2026-08-29: an invalid key answers `400 {"error":"invalid
   * api key"}` — the same shape whether the key is missing, malformed, or
   * simply wrong, so `test` reports Canny's own message rather than
   * pretending to distinguish cases Canny itself does not.
   */
  async test({ credential }, ctx) {
    const cred = credential as Partial<CannyCredential>;
    const key = (cred?.apiKey ?? "").trim();
    if (!key) return { ok: false, message: "credential missing apiKey" };

    const res = await ctx.fetch(`${API_BASE}/v1/boards/list`, {
      method: "POST",
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({ apiKey: key }),
    });
    if (res.ok) return { ok: true };

    const body = await res.json().catch(() => null) as CannyErrorBody | null;
    const message = body?.error;

    if (message === "invalid api key") {
      return {
        ok: false,
        message:
          "Canny rejected the API key. Check it was copied exactly from Settings > API — it may " +
          "also have been regenerated since this connection was created.",
      };
    }
    return {
      ok: false,
      message: message
        ? `Canny rejected the request (${res.status}): ${message}`
        : `Canny returned HTTP ${res.status} for /v1/boards/list`,
    };
  },
};

export default apiKey;
