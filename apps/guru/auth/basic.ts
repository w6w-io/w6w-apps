import type { AuthDefinition } from "@w6w/types";
import { API_BASE, API_PREFIX } from "../lib/client.ts";

/**
 * Guru API credential — HTTP Basic, verified against
 * `developer.getguru.com/reference/authentication` (fetched 2026-09-05, page
 * `updatedAt` 2025-05-21) and confirmed on the wire the same day.
 *
 * ## Two credential shapes share one wire format
 *
 * Guru issues two kinds of token, and both are sent as HTTP Basic with the
 * token as the password — only the username half differs:
 *
 *  - **User token** (read/write): username is the user's email,
 *    `curl -u USER:TOKEN https://api.getguru.com/api/v1/...`.
 *  - **Collection token** (read-only, GET only): username is the *Collection
 *    ID* the token was issued for, `curl -u COLLECTION_ID:TOKEN ...`. The
 *    vendor's own tokens page is explicit that a write against a Collection
 *    token fails, and that the Collection ID has to be looked up first with a
 *    User token via `GET /api/v1/collections`.
 *
 * Because the wire shape (`base64(username:token)`) is identical either way,
 * this app declares one `username` field rather than a `select` for token
 * type — the label just says what goes in each slot. An Action against a
 * Collection-token Connection that needs a write still fails with a real 403
 * from Guru; `formatGuruError` in `lib/client.ts` says so.
 *
 * ## Why the outdated `/api/v1/teams` probe is NOT used
 *
 * The authentication doc's own worked example tests credentials against
 * `GET /api/v1/teams` — but that path does not exist anywhere in Guru's
 * *current* OpenAPI document (fetched from the same ReadMe project the doc
 * lives in), and confirmed live: it answers a bare `401` for both no
 * credential and a fake one, identical to every other unknown path, so it
 * cannot be told apart from "wrong URL" on this API version. Following a
 * five-month-stale doc example here would have cost a debugging session the
 * day Guru finishes removing the route. `GET /api/v1/whoami` is used instead:
 * it is in the current OpenAPI surface, requires a credential (measured:
 * unauthenticated and fake-credential requests both 401), and works
 * identically for a User or a Collection token per its own summary ("Get
 * basic information about the authenticated user **or collection**").
 *
 * ## Why the probe does not read the response body
 *
 * `WhoAmI.collection` is typed `CollectionModel`, and `CollectionModel.token`
 * is a plain, undocumented `string` field in the vendor's own schema — with no
 * description ruling out that it echoes the Collection's own API token back
 * when the request was authenticated with a Collection token. This app has no
 * live Collection-token credential to confirm that one way or the other, and
 * a health probe's response is stored and re-rendered on every check — so
 * `test` below reads only the HTTP status, never the body, and this app
 * declares no "whoami" Action at all. See `README.md` for the parts of this
 * decision that stay open.
 */

export interface GuruCredential {
  username: string;
  token: string;
}

/**
 * The one place the wire format is built. Exported so `test` exercises the
 * same code path `sign` does — a hand-rolled second copy is how a probe ends
 * up sending a header the real requests do not.
 */
export function basicHeader(credential: Partial<GuruCredential>): string {
  return `Basic ${btoa(`${credential.username ?? ""}:${credential.token ?? ""}`)}`;
}

/**
 * `GET /api/v1/whoami` — see the module doc for why this path and not the
 * authentication doc's own (stale) `/api/v1/teams` example.
 */
export const PROBE_PATH = "/whoami";

const basic: AuthDefinition = {
  key: "basic",
  type: "basic",
  displayName: "Username & API Token",
  description:
    "A User token (email as username, read/write) or a Collection token (Collection ID as " +
    "username, read-only) from Guru — see console.getguru.com or the Help Center article " +
    "'Guru's API'. Sent as HTTP Basic.",
  connectionLabel: "Guru ({{username}})",
  fields: [
    {
      key: "username",
      label: "Username",
      type: "secret",
      required: true,
      hint: "Your Guru account email for a User token (read/write), or the Collection ID for a " +
        "Collection token (read-only). Half of the credential — treated as a secret because " +
        "Basic auth has no notion of a public username.",
    },
    {
      key: "token",
      label: "API Token",
      type: "secret",
      required: true,
      hint: "From your Guru user settings (User token) or a Collection's settings (Collection " +
        "token). Guru does not display an existing token again if it is lost — issue a new one.",
    },
  ],

  /**
   * The only hook handed the raw credential, and it runs network-less: it
   * stamps the Basic header and returns. The credential never appears in a
   * URL — Guru documents no alternative query-parameter form to avoid.
   */
  sign({ request, credential }) {
    request.headers["authorization"] = basicHeader(credential as Partial<GuruCredential>);
    return request;
  },

  /**
   * See {@link PROBE_PATH} and the module doc for why `/whoami`, why not
   * `/teams`, and why only the status is read.
   */
  async test({ credential }, ctx) {
    const cred = credential as Partial<GuruCredential>;
    const username = (cred?.username ?? "").trim();
    const token = (cred?.token ?? "").trim();
    if (!username || !token) return { ok: false, message: "credential missing username or token" };

    const res = await ctx.fetch(`${API_BASE}${API_PREFIX}${PROBE_PATH}`, {
      headers: { accept: "application/json", authorization: basicHeader({ username, token }) },
    });
    if (res.ok) return { ok: true };

    if (res.status === 401) {
      return {
        ok: false,
        message: "Guru rejected the credential (401). Check the username (email or Collection " +
          "ID) and token were copied exactly, and that the token has not been revoked.",
      };
    }
    return { ok: false, message: `Guru returned HTTP ${res.status} for ${PROBE_PATH}` };
  },
  /**
   * There is no `afterConnect`, and that is deliberate.
   *
   * `whoami`'s response is the only place Guru would label a User-token
   * Connection with a name, but it also carries the `collection` object whose
   * undocumented `token` field this app declines to read at all (see the
   * module doc). A Collection-token Connection has no user identity to show
   * regardless. Rather than read part of a response this app has decided not
   * to trust, the Connection is labelled by the username field alone —
   * `connectionLabel` above already does that.
   */
};

export default basic;
