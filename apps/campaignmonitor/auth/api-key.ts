import type { AuthDefinition } from "@w6w/types";
import { API_BASE, API_PREFIX, CREDENTIAL_FAILURE_CODES } from "../lib/client.ts";

/**
 * Campaign Monitor API key, carried as HTTP Basic with the key as the USERNAME.
 *
 * ## The wire format, in the vendor's own words
 *
 * > "You may also use an API key and HTTP Basic Authentication to authenticate
 * > API requests. … When you make an API request you provide your API key as the
 * > **username** and the password portion can be blank or a dummy value, as it
 * > is not used for authentication."
 *
 * and the reference's own worked example:
 *
 *     curl -u "dklkmwlmkdy7qwd98y98y98y8d68d9:x" \
 *          https://api.createsend.com/api/v3.3/clients.json
 *
 * So the base64 payload is `${apiKey}:${password}` and the password is
 * *documented as ignored*. This hook sends a literal `x`, matching the vendor's
 * example, rather than an empty string: both are documented as acceptable, and
 * an intermediary that strips a trailing colon-with-nothing cannot corrupt the
 * `x` form. Confirmed live on 2026-08-11 — `-u "notarealkey…:x"` reaches the
 * authenticator and is answered `401 {"Code":100,"Message":"Invalid API Key"}`,
 * which is the *credential* being rejected rather than the header being
 * malformed.
 *
 * ## Why `type: "basic"` and not `type: "apiKey"`
 *
 * The credential is conceptually an API key, but `ApiKeyConfig` can only say
 * "put this value, with this prefix, in this header/query/body slot". It cannot
 * say "base64 the value with `:x` appended", so declaring `type: "apiKey"`
 * would describe a wire format this app does not use and a host could not
 * reproduce. `type: "basic"` plus an explicit `sign` hook is the accurate
 * description.
 *
 * There is deliberately ONE field rather than the usual username/password pair.
 * The password is not a secret the user holds — the vendor fixes it as ignored —
 * so prompting for it would invite people to type something and wonder why it
 * does not matter.
 *
 * ## Account key vs client key — the same field, two scopes
 *
 * Campaign Monitor issues API keys at **two** levels, and the API behaves
 * differently under each:
 *
 *  - an **account** API key (Account settings → API keys) addresses the whole
 *    account: `/clients.json` lists every client, and the `/transactional`
 *    endpoints then *require* an explicit `clientID` query parameter — the
 *    vendor's note reads "if you are using an account API key or OAuth, this is
 *    required as you need to specify the client";
 *  - a **client** API key (the `ApiKey` field of `GET /clients/{clientid}.json`)
 *    is bound to one client, and the same note continues: "This is not
 *    necessary if you use a client-specific API key."
 *
 * Nothing in the *credential* says which kind it is, which is why the
 * transactional actions expose `clientId` as an optional param with that
 * distinction spelled out at the field, instead of guessing.
 */

/**
 * Inlined base64 encoder — the app sandbox runs with `import: false`, so
 * `jsr:@std/encoding` is not reachable at runtime. Same output as that module's
 * `encodeBase64`: standard base64 with `=` padding, no url-safe substitutions.
 */
function encodeBase64(input: string): string {
  const bytes = new TextEncoder().encode(input);
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

/**
 * The password half of the Basic pair.
 *
 * Documented as unused ("the password portion can be blank or a dummy value, as
 * it is not used for authentication"); `x` is the vendor's own example value.
 */
export const IGNORED_PASSWORD = "x";

/**
 * The one place the wire format is built. Exported so `test` and the unit tests
 * exercise the same code path `sign` does — a hand-rolled second copy in `test`
 * is exactly how a separator goes missing.
 */
export function basicHeader(apiKey: string): string {
  return `Basic ${encodeBase64(`${apiKey}:${IGNORED_PASSWORD}`)}`;
}

/**
 * The credential-liveness probe: `GET /api/v3.3/systemdate.json`.
 *
 * Chosen by reading response *schemas*, because two of the obvious candidates
 * are actively wrong:
 *
 * **(a) Not `GET /clients/{clientid}.json`.** Campaign Monitor's client-details
 * endpoint is documented as returning "the complete details for a client
 * **including their API key**", and its published example response literally
 * begins `"ApiKey": "639d8cc…"`. That is a live credential for that client. A
 * health probe's response is stored and displayed, so probing there would copy a
 * working credential into the health surface on every check, forever. (Mailjet's
 * `/apikey`, Follow Up Boss's `/me`, ElevenLabs' `/v1/user` and Podio's
 * `/app/{id}` are the same trap and are already banned pack-wide.) The endpoint
 * is still reachable as the `client-get` Action, which deletes that field before
 * returning — see `lib/client.ts#stripSecrets`.
 *
 * **(b) Not `GET /billingdetails.json`.** It is an account-level, agency-facing
 * read; a non-agency customer is answered `403 {"Code":403,"Message":"Not
 * allowed for a Non-agency Customer."}`, which would report a perfectly good
 * credential as broken.
 *
 * **(c) Not `GET /clients.json` either**, for the milder version of the same
 * reason: it enumerates the account's clients, which is the one thing a
 * *client*-scoped key exists not to be able to do.
 *
 * `/systemdate.json` is what is left, and it is the right answer on its own
 * merits: it is account metadata belonging to no resource, its entire documented
 * response is `{"SystemDate": "2010-11-16 14:18:00"}` — one string, nothing
 * secret, nothing enumerable — and it is the cheapest read in the API.
 *
 * It is **not** provable-by-probing that this path requires a credential,
 * because this API answers 401 for unknown paths too
 * ({@link ../lib/client.ts#AUTH_PRECEDES_ROUTING}). It is provable from the
 * reference: `systemdate` is documented under Account with a 200 example, and
 * every documented API call is authenticated. Measured unauthenticated on
 * 2026-08-11: `401 {"Code":100,"Message":"Invalid API Key"}`.
 */
export const PROBE_PATH = "/systemdate.json";

/**
 * Kept as an exported constant so the reason survives the next person who
 * notices that the client-details endpoint is more informative.
 */
export const WHY_NOT_CLIENT_DETAILS =
  "GET /api/v3.3/clients/{clientid}.json returns ApiKey, a working credential for that client";

const apiKey: AuthDefinition = {
  key: "api-key",
  type: "basic",
  displayName: "API Key",
  description:
    "Paste an API key from Campaign Monitor → Account settings → API keys. Sent as HTTP Basic " +
    "with the key as the username. An account key or a client-specific key both work; a client " +
    "key can only address its own client.",
  connectionLabel: "{{label}}",
  fields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "secret",
      required: true,
      hint:
        "Campaign Monitor → your profile image → Account settings → API keys. The password half " +
        "of HTTP Basic is ignored by Campaign Monitor, so there is nothing else to enter.",
    },
  ],

  /**
   * The ONLY hook handed the raw credential, and it runs network-less: it stamps
   * the header onto the outbound request and returns it. The key never appears
   * in a URL.
   */
  sign({ request, credential }) {
    const { apiKey: key } = credential as { apiKey: string };
    request.headers["authorization"] = basicHeader(key);
    return request;
  },

  /** See {@link PROBE_PATH} for why this endpoint and not the client details. */
  async test({ credential }, ctx) {
    const cred = credential as { apiKey?: string } | null;
    const key = (cred?.apiKey ?? "").trim();
    if (!key) return { ok: false, message: "credential missing apiKey" };

    const res = await ctx.fetch(`${API_BASE}${API_PREFIX}${PROBE_PATH}`, {
      headers: { accept: "application/json", authorization: basicHeader(key) },
    });
    if (res.ok) return { ok: true };

    // Classify from the BODY, never the status: this API returns 401 for a bad
    // key (100), for a bad OAuth token (120/121/122) AND for a wrong client id
    // (102) — and 403 both for a rejected request and for "you are not an
    // agency", which is a live credential.
    const raw = await res.text().catch(() => "");
    let code: number | undefined;
    let message: string | undefined;
    try {
      const body = JSON.parse(raw) as { Code?: number; Message?: string };
      code = typeof body.Code === "number" ? body.Code : undefined;
      message = body.Message;
    } catch { /* not JSON — the status is then the more honest answer */ }

    if (code === 100) {
      return {
        ok: false,
        message:
          "Campaign Monitor rejected the API key (code 100). The same code is returned when no " +
          "credential reaches the request at all, so check the key was copied exactly from " +
          "Account settings → API keys and has not been regenerated.",
      };
    }
    if (code !== undefined && CREDENTIAL_FAILURE_CODES.has(code)) {
      return { ok: false, message: `Campaign Monitor rejected the credential (code ${code})` };
    }
    if (code === 403) {
      // "Not allowed for a Non-agency Customer" — the credential is live.
      return {
        ok: false,
        message:
          "Campaign Monitor refused the account-level read (code 403, non-agency customer). The " +
          "credential itself was accepted.",
      };
    }
    return {
      ok: false,
      message: `Campaign Monitor returned HTTP ${res.status}${
        code !== undefined ? ` code ${code}` : ""
      }${message ? `: ${message}` : ""} for ${PROBE_PATH}`,
    };
  },

  /**
   * Label the Connection with the client it can see.
   *
   * `GET /clients.json` returns only `[{ClientID, Name}]` — no credential
   * material of any kind, unlike the per-client details endpoint — so it is safe
   * to read here even though it is deliberately not the probe. A client-scoped
   * key may be refused it, and a failure is therefore silent: `test` has already
   * established the credential is live, and a missing display label must never
   * fail a good Connection.
   */
  async afterConnect({ credential }, ctx) {
    const cred = credential as { apiKey?: string } | null;
    const key = (cred?.apiKey ?? "").trim();
    if (!key) return {};
    try {
      const res = await ctx.fetch(`${API_BASE}${API_PREFIX}/clients.json`, {
        headers: { accept: "application/json", authorization: basicHeader(key) },
      });
      if (!res.ok) return {};
      const clients = await res.json() as Array<{ ClientID?: string; Name?: string }>;
      if (!Array.isArray(clients) || clients.length === 0) return {};
      // One client is the common case (a direct customer, or a client-scoped
      // key); an agency account gets a count instead of an arbitrary first name.
      return clients.length === 1
        ? {
          label: `Campaign Monitor (${clients[0].Name ?? "1 client"})`,
          client: { id: clients[0].ClientID, name: clients[0].Name },
          clientCount: 1,
        }
        : {
          label: `Campaign Monitor (${clients.length} clients)`,
          clientCount: clients.length,
        };
    } catch {
      return {};
    }
  },
};

export default apiKey;
