import type { AuthDefinition } from "@w6w/types";
import { API_BASE } from "../lib/client.ts";

/**
 * OneSignal App ID + App API Key (`custom`) — two values, not one.
 *
 * Verified 2026-09-05 against the OpenAPI document's per-operation
 * `Authorization` parameter (`"Key YOUR_APP_API_KEY"`) and a live
 * unauthenticated probe against `api.onesignal.com`. `type: "custom"` rather
 * than `apiKey` because the header value carries a non-standard scheme
 * (`Key <token>`, not `Bearer`), and because a second, non-secret field (the
 * App ID) travels alongside the credential — the same shape this pack already
 * uses for Algolia's application-id + api-key pair.
 *
 * ## Why App API key, not the legacy REST/User Auth key
 *
 * OneSignal's "Keys & IDs" guide states the legacy REST API key and User Auth
 * key "are still accepted, but the management UI for them has been removed
 * and new keys cannot be created." Building against a key type an operator
 * can no longer generate would make onboarding new Connections a dead end, so
 * this app is built only against the current `os_v2_app_...` App API key.
 *
 * ## Why App key, not Organization key
 *
 * An Organization API key spans every app on the account and is required only
 * for a disjoint set of endpoints (list/create apps, update an app's platform
 * config, API-key management, audit logs) — none of which this app declares.
 * See `lib/client.ts` for the full reasoning. Mixing the two auth scopes into
 * one Connection would silently 403 half this app's actions for anyone who
 * (correctly) provisioned only an App key.
 */

export interface OneSignalCredential {
  appId: string;
  apiKey: string;
}

/** The one place the wire format is built, so `sign` and `test` never drift apart. */
export function authHeaders(credential: Partial<OneSignalCredential>): Record<string, string> {
  return { authorization: `Key ${credential.apiKey ?? ""}` };
}

const apiKey: AuthDefinition = {
  key: "api-key",
  type: "custom",
  displayName: "App ID & App API Key",
  description: "From the OneSignal dashboard → Settings → Keys & IDs. The App ID is public; the " +
    "App API key starts with os_v2_app_ and is shown only once when created or rotated.",
  connectionLabel: "OneSignal ({{appId}})",
  fields: [
    {
      key: "appId",
      label: "App ID",
      type: "string",
      required: true,
      placeholder: "8cf5a5a8-6c56-4e1e-9b3f-6c8e6a5e6b1e",
      hint: "OneSignal dashboard → Settings → Keys & IDs. A UUID v4; not a secret.",
      validation: {
        pattern: "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$",
      },
    },
    {
      key: "apiKey",
      label: "App API Key",
      type: "secret",
      required: true,
      hint: "Settings → Keys & IDs → Add Key. Scoped to this one app; sent as " +
        "`Authorization: Key <value>`.",
    },
  ],

  /** The only hook handed the raw credential. Runs network-less: stamps the header, returns. */
  sign({ request, credential }) {
    const cred = credential as Partial<OneSignalCredential>;
    for (const [name, value] of Object.entries(authHeaders(cred))) {
      request.headers[name] = value;
    }
    return request;
  },

  /**
   * `GET /apps/{app_id}/segments` — chosen over the tempting `GET /apps/{app_id}`
   * (View an app) because that endpoint's response schema includes live push
   * credentials (`fcm_v1_service_account_json`, `apns_p8`,
   * `safari_apns_certificate`, the legacy `gcm_key`) — see `actions/view-app.ts`
   * for the full accounting of why those must never appear in a health probe's
   * stored result. Segments needs the same App API key, is scoped to exactly
   * this app, and its response carries nothing but segment metadata (id, name,
   * filters count) — every app has at least the two built-in segments
   * ("Subscribed Users", "Total Subscriptions"), but even an empty list on a
   * brand-new app is still a `200`, which is all this probe needs.
   *
   * A missing header and a syntactically-plausible-but-wrong key answer with
   * the **identical** message (measured live, 2026-09-05):
   * `{"errors": ["Access denied. Please include an 'Authorization: ...' header
   * with a valid API key ..."]}`. So `test()` cannot distinguish "no
   * credential reached the request" from "the credential is wrong" — both are
   * reported the same way, and the message says so rather than guessing which.
   */
  async test({ credential }, ctx) {
    const cred = credential as Partial<OneSignalCredential>;
    const appId = (cred?.appId ?? "").trim();
    const token = (cred?.apiKey ?? "").trim();
    if (!appId) return { ok: false, message: "credential missing appId" };
    if (!token) return { ok: false, message: "credential missing apiKey" };

    const res = await ctx.fetch(
      `${API_BASE}/apps/${encodeURIComponent(appId)}/segments?limit=1`,
      { headers: { accept: "application/json", ...authHeaders({ apiKey: token }) } },
    );
    if (res.ok) return { ok: true };

    const body = await res.json().catch(() => null) as { errors?: unknown[] } | null;
    const detail = body?.errors?.map((e) => (typeof e === "string" ? e : JSON.stringify(e)))
      .join("; ");

    if (res.status === 401) {
      return {
        ok: false,
        message: "OneSignal rejected the request (401). Either no Authorization header " +
          "reached the API or the App API key is wrong or revoked — the vendor's own error " +
          "does not distinguish the two. Reconnect with a fresh App API key from Settings > " +
          "Keys & IDs.",
      };
    }
    if (res.status === 403) {
      return {
        ok: false,
        message: `OneSignal refused the segments read (403)${detail ? `: ${detail}` : ""}. ` +
          "Check the key's IP allowlist, or that it is an App API key rather than an " +
          "Organization API key.",
      };
    }
    if (res.status === 404) {
      return { ok: false, message: `no OneSignal app found for App ID ${appId}` };
    }
    return {
      ok: false,
      message: `OneSignal returned HTTP ${res.status} for /apps/${appId}/segments${
        detail ? `: ${detail}` : ""
      }`,
    };
  },

  /**
   * Records nothing beyond confirming the App ID resolves — the App ID itself
   * is already the field the user typed, so there is nothing more to fetch
   * safely. Deliberately does **not** call `GET /apps/{app_id}`: see
   * `actions/view-app.ts` for why that endpoint's response is unsafe to read
   * incidentally.
   */
  afterConnect({ credential }) {
    const cred = credential as Partial<OneSignalCredential>;
    return Promise.resolve({ appId: cred.appId });
  },
};

export default apiKey;
