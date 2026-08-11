import type { AuthDefinition } from "@w6w/types";
import { fetchUserInfo, probeCredential } from "./probe.ts";

/**
 * Personal Access Token / Service Account Key — Keap's non-OAuth credential.
 *
 * Verified 2026-08-11 against `developer.infusionsoft.com/pat-and-sak/`, which
 * is the vendor's own page for it and gives the wire format verbatim:
 *
 *     URI:     https://api.infusionsoft.com/crm/rest/v1
 *              https://api.infusionsoft.com/crm/rest/v2
 *     Headers: "Authorization": "Bearer ProvideYourKeyHere"
 *
 * Same header as OAuth, no flow, no client registration, no expiry. It is
 * created in the Keap app itself under Settings > API Settings, shown once,
 * and thereafter identified only by a truncated prefix.
 *
 * ## The two kinds are not interchangeable, and the difference is permissions
 *
 * Keap issues both under one screen and one header, but their authority
 * differs, and that difference is what makes this app's health probe the one it
 * is:
 *
 *  - **Personal Access Token** — "Any user of the app can create [one], but it
 *    operates under the user context of the user creating it, with that user's
 *    visibility and editing permissions." So a PAT held by a restricted user is
 *    a *live* credential that will still be refused plenty of reads.
 *  - **Service Account Key** — "Only admins can create [one] as it will grant
 *    admin access to all of your stored data."
 *
 * Because a PAT can legitimately be refused a contact list, the credential
 * probe must be something no permission can withhold. See `auth/probe.ts`.
 *
 * ## The quota is an order of magnitude tighter than OAuth's
 *
 * Documented at `developer.infusionsoft.com/api-token-quota-and-usage-measurements`:
 * a PAT or SAK gets **10 queries/second, 240/minute and 30,000/day**, and "may
 * only access its single authorized Keap application" — where an OAuth
 * client/secret pair gets 1,500/minute and 150,000/day across every app it is
 * connected to. Choosing this method for a high-volume workflow is a 6x cut in
 * throughput; `health/quota.ts` reads the live numbers so it shows up before it
 * bites.
 *
 * ## Legacy XML-RPC API Keys are deliberately not modelled
 *
 * Keap's "Legacy Key Deprecation" notice says a legacy key can still be sent as
 * `Authorization: Bearer <legacy key>`, so one would technically work here. It
 * is not offered as an option, and no field mentions it, because the same
 * notice announces scheduled brownouts and eventual deactivation, and because
 * offering a credential type the vendor is actively removing would be building
 * in a future outage. Migrate to a Service Account Key.
 */

export interface KeapAccessKeyCredential {
  accessKey: string;
}

/**
 * The one place this method's wire format is built. Exported so `test` and
 * `afterConnect` exercise the same code path `sign` does.
 */
export function authHeaders(
  credential: Partial<KeapAccessKeyCredential>,
): Record<string, string> {
  return { authorization: `Bearer ${credential.accessKey ?? ""}` };
}

const accessKey: AuthDefinition = {
  key: "access-key",
  type: "bearer",
  displayName: "Personal Access Token / Service Account Key",
  description:
    "Paste a key from your Keap app under Settings > API Settings (Keap Classic: Profile > API " +
    "Settings). A Service Account Key grants admin access to all data; a Personal Access Token " +
    "acts as the user who created it. Both are throttled far more tightly than OAuth: 10/second, " +
    "240/minute, 30,000/day.",
  connectionLabel: "Keap — {{name}} ({{tenantId}})",
  fields: [
    {
      key: "accessKey",
      label: "Access key",
      type: "secret",
      required: true,
      hint:
        "Keap shows the full value exactly once, when you create it. If you no longer have it, " +
        "delete the key and create a new one rather than guessing — the API Settings list only " +
        "shows a truncated prefix.",
    },
  ],

  /** Credential-only and network-less: stamp the header, return the request. */
  sign({ request, credential }) {
    const cred = credential as Partial<KeapAccessKeyCredential>;
    for (const [name, value] of Object.entries(authHeaders(cred))) {
      request.headers[name] = value;
    }
    return request;
  },

  /** See `auth/probe.ts` for why this endpoint, and why the body decides. */
  test({ credential }, ctx) {
    const cred = (credential ?? {}) as Partial<KeapAccessKeyCredential>;
    const key = (cred.accessKey ?? "").trim();
    if (!key) return Promise.resolve({ ok: false, message: "credential missing accessKey" });
    return probeCredential(authHeaders({ accessKey: key }), ctx, "Keap");
  },

  /** Publish the user and Keap app this key belongs to. Nothing secret is kept. */
  afterConnect({ credential }, ctx) {
    const cred = (credential ?? {}) as Partial<KeapAccessKeyCredential>;
    if (!cred.accessKey) return Promise.resolve({});
    return fetchUserInfo(authHeaders(cred), ctx);
  },
};

export default accessKey;
