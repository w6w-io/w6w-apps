import type { AuthDefinition } from "@w6w/types";
import {
  API_KEY_PATTERN,
  environmentFromApiKey,
  hostForEnvironment,
  LEGACY_API_KEY_PATTERN,
  type PaddleEnvironment,
} from "../lib/client.ts";

/**
 * Paddle Billing API key — `Authorization: Bearer pdl_…`.
 *
 * Verified against Paddle's authentication guide
 * (`developer.paddle.com/api-reference/about/authentication.md`, fetched
 * 2026-08-10) and live probes against `api.paddle.com` on the same day.
 *
 * ## The key selects the host
 *
 * Paddle runs live and sandbox as two separate environments on two separate
 * hosts with two separate datasets, and the key says which one it is for:
 * `pdl_live_apikey_…` → `api.paddle.com`, `pdl_sdbx_apikey_…` →
 * `sandbox-api.paddle.com`. Asking the user to choose an environment *as well
 * as* paste a key would only create a way to get the pair wrong, so the host is
 * derived from the credential in `sign` — the one hook that holds it on every
 * call — following the same pattern as `apps/mailchimp`'s datacenter suffix.
 *
 * Deriving it in `sign` rather than trusting `display.environment` makes the
 * client self-healing: `afterConnect` is not guaranteed to have run, and a
 * Connection restored from an older record may carry nothing at all.
 *
 * ## Legacy keys
 *
 * Keys created before 2025-05-06 are a bare 50-character lowercase string with
 * no prefix, so they carry no environment marker. Paddle's guidance is to
 * revoke and replace them. They are detected here purely so the user is told
 * that, in those words, instead of being handed a shapeless validation error —
 * and because a legacy key silently defaulting to the live host is exactly the
 * mistake worth naming out loud.
 *
 * ## Permissions
 *
 * Paddle keys carry granular permissions (`product.read`, `subscription.write`,
 * …) chosen at creation. A request made with a key lacking the permission an
 * endpoint needs returns `403 forbidden`. That is why the probe below is the
 * one endpoint in the API that needs no permission at all.
 */

export interface PaddleCredential {
  apiKey: string;
}

/**
 * The one place the wire format is built. Exported so `test` and `afterConnect`
 * exercise the same code path `sign` does — a hand-rolled second copy is how a
 * probe ends up sending a header the real requests do not.
 */
export function authHeaders(credential: Partial<PaddleCredential>): Record<string, string> {
  return { authorization: `Bearer ${credential.apiKey ?? ""}` };
}

/**
 * Describe what is wrong with a key's *shape*, before it is ever sent.
 *
 * Returns `undefined` when the key looks like a current Paddle Billing key.
 * This exists because the two most likely wrong things to paste — a Paddle
 * Classic `vendor_auth_code` and a client-side token — both fail with an opaque
 * 403, and neither failure tells the user which of their several Paddle
 * credentials they grabbed.
 */
export function describeKeyProblem(apiKey: string): string | undefined {
  if (!apiKey) return "credential missing apiKey";
  if (API_KEY_PATTERN.test(apiKey)) return undefined;
  if (LEGACY_API_KEY_PATTERN.test(apiKey)) {
    return "This looks like a legacy Paddle API key (created before 6 May 2025). Legacy keys " +
      "carry no environment marker, so this app cannot tell whether it is a live or a sandbox " +
      "key. Create a new key in Paddle > Developer tools > Authentication and use that instead.";
  }
  if (apiKey.startsWith("pdl_") && apiKey.includes("_ctkn_")) {
    return "This is a Paddle client-side token, not an API key. Client-side tokens only work " +
      "with Paddle.js in a browser. Create an API key under Paddle > Developer tools > " +
      "Authentication > API keys.";
  }
  if (/^[a-f\d]{8}-[a-f\d]{4}-/i.test(apiKey) || /^[a-f\d]{32,}$/i.test(apiKey)) {
    return "This does not look like a Paddle Billing API key. If it came from Paddle Classic " +
      "(a `vendor_auth_code` used with vendors.paddle.com), it cannot authenticate the Billing " +
      "API this app uses.";
  }
  return "This does not match Paddle's API key format (`pdl_live_apikey_…` or " +
    "`pdl_sdbx_apikey_…`, 69 characters). Copy the key exactly as Paddle showed it.";
}

const apiKey: AuthDefinition = {
  key: "api-key",
  type: "bearer",
  displayName: "API Key",
  description:
    "Paste an API key from Paddle > Developer tools > Authentication > API keys. Whether it is a " +
    "live or a sandbox key is read from the key itself — there is nothing else to choose.",
  connectionLabel: "Paddle ({{environment}})",
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      placeholder: "pdl_live_apikey_…",
      hint:
        "Grant it only the permissions this connection needs — Paddle returns 403 for anything " +
        "outside them. Paddle shows the key once and cannot show it again. Keys expire: the " +
        "default is 90 days and the maximum is one year.",
    },
  ],

  /**
   * The only hook handed the raw credential, and it runs network-less: it
   * stamps the bearer header and rewrites the host for the key's environment.
   */
  sign({ request, credential }) {
    const cred = credential as Partial<PaddleCredential>;
    for (const [name, value] of Object.entries(authHeaders(cred))) {
      request.headers[name] = value;
    }
    const environment = environmentFromApiKey(cred.apiKey ?? "");
    // A legacy key yields `undefined` and `hostForEnvironment` falls back to
    // live — which is what Paddle's own docs imply for a pre-2025 key, and
    // which `test` warns about explicitly rather than leaving to chance.
    try {
      const url = new URL(request.url);
      url.hostname = hostForEnvironment(environment);
      request.url = url.toString();
    } catch {
      // Malformed request URL — leave it alone. The call fails with a clear
      // transport error rather than being silently redirected somewhere else.
    }
    return request;
  },

  /**
   * `GET /event-types` is the probe, and it was chosen by measuring three
   * things on the wire on 2026-08-10, not by its name:
   *
   * **(a) It genuinely requires a credential.** With no `Authorization` header
   * it answers `403 authentication_missing`. That rules out the tempting
   * alternative, `GET /ips`, which is *unauthenticated* — it returns `200` with
   * no header at all, so a Connection whose credential never got attached would
   * pass a probe against it. It validates a header when one is sent (a bad key
   * gives `403 authentication_malformed`), but a check that can pass without a
   * credential is not a credential check.
   *
   * **(b) It needs no permission.** Paddle keys carry granular permissions and
   * every scoped endpoint documents a "Required permissions" line;
   * `GET /event-types` has none, and `GET /products` — the other obvious
   * candidate — requires `product.read` and answers `403 forbidden` without it.
   * Probing `/products` would report a correctly-scoped subscription-only key
   * as broken, which is the *desired* configuration.
   *
   * **(c) It returns nothing about the account.** The response is Paddle's
   * static vocabulary of webhook event-type names (`address.created`,
   * `subscription.updated`, …) — the same list for every caller. There is no
   * account data and, unlike the `/me`-shaped probes that leak (Follow Up
   * Boss's `/me`, Mailjet's `/apikey`), no credential material of any kind.
   *
   * The status codes are distinguished because Paddle's are specific enough to
   * act on: `403` with `authentication_missing` / `authentication_malformed` /
   * `forbidden` are three different problems with three different fixes.
   */
  async test({ credential }, ctx) {
    const cred = credential as Partial<PaddleCredential>;
    const problem = describeKeyProblem(cred?.apiKey ?? "");
    if (problem) return { ok: false, message: problem };

    const environment = environmentFromApiKey(cred.apiKey!);
    const host = hostForEnvironment(environment);
    const res = await ctx.fetch(`https://${host}/event-types`, {
      headers: { accept: "application/json", ...authHeaders(cred) },
    });

    if (res.ok) return { ok: true };

    const body = await res.json().catch(() => null) as
      | { error?: { code?: string; detail?: string } }
      | null;
    const code = body?.error?.code;
    if (code === "authentication_malformed" || code === "authentication_invalid") {
      return {
        ok: false,
        message:
          `Paddle rejected the key (${res.status} ${code}). Check it was copied exactly and has ` +
          "not been revoked, rotated or expired.",
      };
    }
    if (res.status === 401 || res.status === 403) {
      return {
        ok: false,
        message: `Paddle rejected the key (${res.status}${code ? ` ${code}` : ""})` +
          `${body?.error?.detail ? `: ${body.error.detail}` : ""}`,
      };
    }
    return { ok: false, message: `Paddle returned HTTP ${res.status} for ${host}/event-types` };
  },

  /**
   * Records which environment this Connection talks to, so the client can build
   * URLs — and a UI can label the Connection — without seeing the key again.
   *
   * Nothing else is published, because there is nothing else safe and useful to
   * publish: Paddle Billing has no whoami endpoint, and every endpoint that
   * would name the account (customers, products) needs a permission this key
   * may legitimately lack. An `environment` of `live` versus `sandbox` is
   * exactly the distinction someone looking at a list of Connections needs.
   */
  afterConnect({ credential }) {
    const cred = credential as Partial<PaddleCredential>;
    const environment: PaddleEnvironment | undefined = environmentFromApiKey(cred?.apiKey ?? "");
    if (!environment) return {};
    return { environment, host: hostForEnvironment(environment) };
  },
};

export default apiKey;
