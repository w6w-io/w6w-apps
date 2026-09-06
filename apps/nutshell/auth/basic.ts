import type { AuthDefinition } from "@w6w/types";
import { API_URL, buildRpcBody, unwrapRpc } from "../lib/client.ts";

/**
 * HTTP Basic — a Nutshell user's email as the username, an API key as the
 * password.
 *
 * Confirmed against Nutshell's own authentication reference
 * (`developers.nutshell.com/docs/api-authentication`, fetched 2026-09-06):
 * "All of our APIs use HTTP Basic authentication... Use a Nutshell user's
 * email address as the username. Use your API key as the password." The
 * JSON-RPC-specific reference (`developers-rpc.nutshell.com`) adds one detail
 * the REST-facing doc omits: **the username may also be the company's
 * domain**, in which case the change is attributed to the API key's own name
 * rather than a specific user (the "impersonation" permission controls
 * whether a per-user email is even accepted). This app always asks for a
 * user's email — the common case, and the one the top-level auth doc
 * documents — since a domain-only key has no natural "connection label" to
 * show a workflow author.
 *
 * ## Verified live, 2026-09-06, against Nutshell's public API sandbox
 *
 * Using the sandbox credentials Nutshell publishes on the same page
 * (`jim@demo.nutshell.com`):
 *
 *   - A correct pair on `getUpdateTimes` returns `HTTP 200` with a `result`
 *     object and no `error` key.
 *   - A wrong API key returns `HTTP 401` with body
 *     `{"error":{"code":401,"message":"API key not found","data":null}}`.
 *
 * So — unlike some JSON-RPC APIs — a rejected Nutshell credential is a real
 * transport-level 401, not a 200 hiding an error object. `test` below still
 * reads the body rather than trusting the status code alone, because the
 * status alone carries no message a user could act on.
 */

export interface NutshellCredential {
  email: string;
  apiKey: string;
}

/**
 * The one place the Basic header is built, so `sign` and `test` share it
 * rather than risking two implementations drifting apart.
 */
export function basicHeader(credential: Partial<NutshellCredential>): string {
  return `Basic ${btoa(`${credential.email ?? ""}:${credential.apiKey ?? ""}`)}`;
}

/**
 * `getUpdateTimes` — the credential-liveness probe.
 *
 * Chosen over the more obvious `getUser()` (no id → "the logged-in user")
 * because `getUpdateTimes` takes no parameters, names no entity, and its
 * response body is a small map of bin names to timestamps — nothing that
 * could be mistaken for credential material or for a specific person's PII.
 * It still requires a valid, authenticated call to answer at all (confirmed
 * live: an invalid key gets the 401 above instead of a result), so it proves
 * the full round trip: the credential reached the request and Nutshell
 * accepted it.
 */
export const PROBE_METHOD = "getUpdateTimes";

const basic: AuthDefinition = {
  key: "basic",
  type: "basic",
  displayName: "Email & API Key",
  description: "A Nutshell user's email address and an API key from Setup > API keys. Sent as " +
    "HTTP Basic credentials on every request.",
  connectionLabel: "{{email}}",
  fields: [
    {
      key: "email",
      label: "Email",
      type: "string",
      required: true,
      row: "creds",
      placeholder: "you@company.com",
      hint: "The email address of the Nutshell user this connection acts as.",
    },
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      row: "creds",
      hint: "Setup > API keys in Nutshell. The key must allow impersonation if Email belongs to " +
        "someone other than the key's own account owner.",
    },
  ],

  /**
   * The only hook handed the raw credential, and it runs network-less: it
   * stamps the Basic header and returns.
   */
  sign({ request, credential }) {
    request.headers["authorization"] = basicHeader(credential as Partial<NutshellCredential>);
    return request;
  },

  /** See {@link PROBE_METHOD} for why `getUpdateTimes` and not a `get`/`find` on real data. */
  async test({ credential }, ctx) {
    const cred = credential as Partial<NutshellCredential>;
    const email = (cred?.email ?? "").trim();
    const apiKey = cred?.apiKey ?? "";
    if (!email || !apiKey) return { ok: false, message: "credential missing email or API key" };

    try {
      const res = await ctx.fetch(API_URL, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          accept: "application/json",
          authorization: basicHeader({ email, apiKey }),
        },
        body: buildRpcBody(PROBE_METHOD, {}),
      });
      unwrapRpc(res.status, await res.text());
      return { ok: true };
    } catch (err) {
      return { ok: false, message: err instanceof Error ? err.message : String(err) };
    }
  },
};

export default basic;
