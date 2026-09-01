import type { AuthDefinition } from "@w6w/types";
import { API_BASE } from "../lib/client.ts";

/**
 * Razorpay Key ID + Key Secret, sent as HTTP Basic — the key id as the
 * username, the key secret as the password.
 *
 * Verified 2026-09-01 against `razorpay.com/docs/api/authentication` (fetched
 * as raw Markdown): "All Razorpay APIs are authenticated using Basic Auth …
 * Basic auth expects an Authorization header … in the `Basic base64token`
 * format" and against the OpenAPI document's `securitySchemes.basicAuth`.
 * Both keys are environment-scoped: `rzp_test_*` for Test mode (no real money
 * movement) and `rzp_live_*` for Live mode, against the *same* API host —
 * there is no separate sandbox origin. Getting the wrong pair on the wrong
 * environment is a silent trap this app cannot detect from the outside: a
 * live key against a workflow meant for testing moves real money.
 *
 * ## The error code never disambiguates; the description does
 *
 * Measured live on 2026-09-01, every authentication failure is `401
 * BAD_REQUEST_ERROR` — the *same* code whether the header is missing,
 * malformed, or simply wrong:
 *
 *  - No `Authorization` header at all: `"Please provide your api key for
 *    authentication purposes"`.
 *  - Any other credential problem (wrong secret, unregistered key,
 *    lower-cased `basic`, a key that has never existed): `"Authentication
 *    failed"`.
 *
 * `test` below matches on `description`, because `code` alone cannot tell
 * "the credential never reached the request" from "the credential is wrong".
 *
 * ## No safe whoami exists, so nothing is fetched to label the connection
 *
 * Razorpay's REST API for a standard (non-Partner) account publishes no
 * `/v1/me` or account-profile read at all — the closest things are
 * Partner-only OAuth account endpoints (`/v2/accounts/**`) that this app does
 * not use. There is therefore nothing to call in `afterConnect`. The
 * connection is instead labelled directly from the key id's own documented
 * prefix (`rzp_test_` / `rzp_live_`), which needs no network call and reveals
 * nothing beyond what choosing which key to paste already told the user.
 */

export interface RazorpayCredential {
  keyId: string;
  keySecret: string;
}

/** The one place the wire format is built — `test` and `sign` share it. */
export function authHeader(credential: Partial<RazorpayCredential>): string {
  return `Basic ${btoa(`${credential.keyId ?? ""}:${credential.keySecret ?? ""}`)}`;
}

/** The cheapest documented read: a one-record payment list. No dedicated ping/whoami exists. */
export const PROBE_PATH = "/payments";

const basic: AuthDefinition = {
  key: "basic",
  type: "basic",
  displayName: "Key ID & Key Secret",
  description:
    "Dashboard → Account & Settings → API Keys. Test mode keys (rzp_test_…) and Live mode keys " +
    "(rzp_live_…) hit the same API host — pick the pair that matches what this connection is for.",
  connectionLabel: "Razorpay ({{mode}})",
  fields: [
    {
      key: "keyId",
      label: "Key ID",
      type: "secret",
      required: true,
      row: "credential",
      hint: "Visible on the Dashboard after generation. Half of the credential pair.",
    },
    {
      key: "keySecret",
      label: "Key Secret",
      type: "secret",
      required: true,
      row: "credential",
      hint: "Shown once, at generation time. Regenerate from the Dashboard if lost.",
    },
  ],

  /**
   * The only hook handed the raw credential, and it runs network-less: it
   * stamps the Basic header and returns.
   */
  sign({ request, credential }) {
    request.headers["authorization"] = authHeader(credential as Partial<RazorpayCredential>);
    return request;
  },

  async test({ credential }, ctx) {
    const cred = credential as Partial<RazorpayCredential>;
    if (!cred?.keyId || !cred?.keySecret) {
      return { ok: false, message: "credential missing keyId or keySecret" };
    }

    const res = await ctx.fetch(`${API_BASE}${PROBE_PATH}?count=1`, {
      headers: { accept: "application/json", authorization: authHeader(cred) },
    });
    if (res.ok) return { ok: true };

    const body = await res.json().catch(() => null) as
      | { error?: { code?: string; description?: string } }
      | null;
    const description = body?.error?.description ?? "";

    if (/provide your api key/i.test(description)) {
      return {
        ok: false,
        message: "Razorpay received no credential. It did not reach the request — reconnect this " +
          "connection.",
      };
    }
    if (res.status === 401) {
      return {
        ok: false,
        message:
          `Razorpay rejected the key id and secret (401${
            description ? `: ${description}` : ""
          }). Check they were copied exactly, are the Test/Live pair you intend, and have not been ` +
          "regenerated on the Dashboard.",
      };
    }
    return {
      ok: false,
      message: `Razorpay returned HTTP ${res.status} for ${PROBE_PATH}${
        description ? `: ${description}` : ""
      }`,
    };
  },

  /**
   * No network call: `mode` comes straight from the key id's own documented
   * prefix, so nothing beyond what the user already chose is disclosed.
   */
  afterConnect({ credential }) {
    const { keyId } = credential as Partial<RazorpayCredential>;
    const mode = keyId?.startsWith("rzp_live_")
      ? "Live"
      : keyId?.startsWith("rzp_test_")
      ? "Test"
      : "unknown mode";
    return { mode };
  },
};

export default basic;
