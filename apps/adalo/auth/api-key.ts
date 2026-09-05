import type { AuthDefinition } from "@w6w/types";
import { API_URL } from "../lib/client.ts";

/**
 * A placeholder Collection ID used only to reach the credential-check gate.
 * Confirmed live: an invalid/missing token answers with the same auth error
 * regardless of whether the collection id after it exists — Adalo checks the
 * token before it checks the collection — so this never needs to be a real
 * collection.
 */
const PROBE_COLLECTION_ID = "w6w-connectivity-check";

/**
 * An Adalo per-app API key (`bearer`). Generate one from the app's Settings →
 * App Access → Generate API Key (or via the "<>" API Documentation button
 * next to any Collection, where the key also appears in the sample cURL after
 * `Bearer`). The key, and every Collections API request, is scoped to the one
 * app it was generated in, so the App ID is collected here alongside it
 * rather than re-typed into every action.
 */
const apiKey: AuthDefinition = {
  key: "api-key",
  type: "bearer",
  displayName: "API Key",
  description:
    "An Adalo App ID and the per-app API key generated for it (Settings → App Access → " +
    "Generate API Key). Requires the Team or Business plan.",
  connectionLabel: "Adalo ({{appId}})",
  fields: [
    {
      key: "appId",
      label: "App ID",
      type: "string",
      required: true,
      hint: "The id in the Adalo builder URL: app.adalo.com/apps/<app_id>/...",
      validation: { pattern: "^[a-zA-Z0-9-]+$" },
    },
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint: "Settings → App Access → Generate API Key. Also visible in any Collection's " +
        '"<>" API Documentation panel, in the sample cURL after `Bearer`.',
    },
  ],

  sign({ request, credential }) {
    const { apiKey } = credential as { apiKey: string };
    request.headers["authorization"] = `Bearer ${apiKey}`;
    return request;
  },

  /**
   * Calls the one real route shape the API exposes
   * (`/v0/apps/{appId}/collections/{collectionId}`) against a placeholder
   * collection id, and classifies by the response BODY — never by status
   * code alone — because Adalo's own docs (Error Codes) also document a
   * `403`-shaped failure for a plan/quota/permission problem that is not a
   * bad credential.
   */
  async test({ credential }, ctx) {
    const { appId, apiKey } = credential as { appId?: string; apiKey?: string };
    if (!appId) return { ok: false, message: "credential missing appId" };
    if (!apiKey) return { ok: false, message: "credential missing apiKey" };

    const res = await ctx.fetch(
      `${API_URL}/${encodeURIComponent(appId)}/collections/${
        encodeURIComponent(PROBE_COLLECTION_ID)
      }`,
      { headers: { authorization: `Bearer ${apiKey}`, accept: "application/json" } },
    );

    const body = await res.json().catch(() => undefined) as { error?: string } | undefined;
    const message = body?.error;

    if (res.status === 401 || /invalid access token/i.test(message ?? "")) {
      return { ok: false, message: `Adalo rejected the API key: ${message ?? res.status}` };
    }
    if (res.status === 403) {
      return {
        ok: false,
        message: "Adalo returned 403 — check the app is on the Team/Business plan, has " +
          "remaining app actions this billing cycle, and the collection's permissions allow " +
          "API access",
      };
    }
    // Any other outcome — 200, or a "collection not found"-shaped 4xx for our
    // placeholder id — means the request got PAST the credential check.
    return { ok: true };
  },

  afterConnect({ credential }) {
    const { appId } = credential as { appId?: string };
    return { appId };
  },
};

export default apiKey;
