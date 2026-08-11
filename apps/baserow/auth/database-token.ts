import type { AuthDefinition } from "@w6w/types";
import { HOSTED_BASE, normalizeSiteUrl } from "../lib/client.ts";

/**
 * Baserow database token — the `Authorization: Token …` header.
 *
 * ## The wire format, from the vendor
 *
 * Baserow's OpenAPI document (`api.baserow.io/api/schema.json`, v2.3.3, fetched
 * 2026-08-10) declares three security schemes. The one this app uses is:
 *
 *     "Database token": { "type": "http", "scheme": "bearer",
 *                         "bearerFormat": "Token your_token" }
 *
 * — i.e. the header is literally `Authorization: Token <token>`, **not**
 * `Bearer`. Verified on the wire: a syntactically valid but unknown token
 * returns `403 {"detail":"The provided token does not exist.",
 * "error":"ERROR_TOKEN_DOES_NOT_EXIST"}`, while no header at all returns
 * `403 {"detail":"Authentication credentials were not provided."}`. Sending the
 * same value with a `JWT` prefix produces the no-credentials answer, which is
 * how a prefix mix-up presents.
 *
 * A token is minted in the Baserow UI at **Settings → Database tokens**, is
 * scoped to **one database**, and carries four independent per-table flags:
 * create, read, update, delete. It can be revoked on its own.
 *
 * ## Why NOT the JWT scheme
 *
 * Baserow's other credential is a JWT from `POST /api/user/token-auth/` with an
 * email and password. It reaches more of the API — table and field *writes*,
 * view configuration, workspace administration. It is deliberately not shipped,
 * for two reasons in descending order of severity:
 *
 *  1. **`sign` cannot make a network call.** The hook that attaches a credential
 *     is network-less by design. A JWT has to be fetched before it can be
 *     attached, so a JWT flow must resolve it at connect time and then cope with
 *     it expiring underneath a Connection that still looks healthy.
 *  2. **It requires storing a human's password**, not a scoped credential. A
 *     database token is bound to one database with per-table permissions.
 *
 * The cost is stated plainly in the README rather than hidden: this app cannot
 * create tables or fields. Every action it *does* ship is one Baserow's own spec
 * marks as accepting a database token.
 *
 * ## Why the instance URL is a field here and not an action param
 *
 * The URL is half the credential's identity: a token minted on
 * `baserow.acme.com` is meaningless on `api.baserow.io`. Baserow's OpenAPI
 * document declares no `servers` block at all, because the host is whatever the
 * operator chose. Putting the URL on the Connection keeps the two halves
 * together and keeps every action host-agnostic; `tests/index.test.ts` asserts
 * no action can take a URL/host param.
 *
 * It is a plain `string`, not a `secret`: a URL is an address, and masking it
 * would make a typo impossible to spot.
 */

export interface BaserowCredential {
  siteUrl: string;
  token: string;
}

/**
 * The one place the wire format is built. Exported so `test` and `afterConnect`
 * exercise the same code path `sign` does — a hand-rolled second copy is exactly
 * how a probe ends up sending a header the real requests do not.
 */
export function authHeaders(credential: Partial<BaserowCredential>): Record<string, string> {
  return { authorization: `Token ${credential.token ?? ""}` };
}

/** The probe. Pinned here and asserted in `tests/index.test.ts`. */
export const PROBE_PATH = "/api/database/tables/all-tables/";

const databaseToken: AuthDefinition = {
  key: "database-token",
  type: "apiKey",
  displayName: "Database Token",
  description:
    "Create a token at Settings → Database tokens in Baserow, then paste it here with your " +
    "instance URL. The token is scoped to one database and to the create/read/update/delete " +
    "permissions you tick.",
  connectionLabel: "{{site.host}}",
  apiKey: {
    in: "header",
    name: "Authorization",
    prefix: "Token ",
  },
  fields: [
    {
      key: "siteUrl",
      label: "Baserow URL",
      type: "string",
      required: true,
      default: HOSTED_BASE,
      placeholder: HOSTED_BASE,
      hint: "`https://api.baserow.io` for Baserow's hosted service, or the root URL of your " +
        "self-hosted instance. A trailing `/api` is stripped for you.",
    },
    {
      key: "token",
      label: "Database Token",
      type: "secret",
      required: true,
      hint:
        "Settings → Database tokens → Create token. It is scoped to the database you pick, so a " +
        "connection reaches exactly that database and no other.",
    },
  ],

  /**
   * The only hook handed the raw credential, and it runs network-less: it stamps
   * the header onto the outbound request and returns it.
   */
  sign({ request, credential }) {
    const cred = credential as Partial<BaserowCredential>;
    for (const [name, value] of Object.entries(authHeaders(cred))) {
      request.headers[name] = value;
    }
    return request;
  },

  /**
   * `GET /api/database/tables/all-tables/` is the probe, and it is the right one
   * for three reasons, all read off the vendor's own spec and confirmed live on
   * 2026-08-10:
   *
   * **(a) It is the only endpoint in the API whose sole accepted scheme is the
   * database token.** Baserow's spec marks it `security: [{"Database token"}]`
   * with no JWT alternative — it exists to answer "what can this token see?".
   * Probing it therefore tests exactly the credential this app uses.
   *
   * **(b) It needs no extra permission.** Every other database-token endpoint is
   * scoped to a table and to one of the token's four create/read/update/delete
   * flags, so probing one would report a correctly-scoped write-only token as
   * broken. This endpoint needs only that the token exist.
   *
   * **(c) It returns no credential material.** The response is the list of
   * tables the token can reach — `{id, name, database_id}` — which is metadata
   * about the user's own data, not about the key. This is the concern that sinks
   * `/me`-shaped probes elsewhere (Follow Up Boss's `/me` returns the caller's
   * own API key; Mailjet's `/apikey` returns key and secret). Baserow has no
   * endpoint that echoes a token back, and this one reads nothing about tokens
   * at all.
   *
   * Baserow's error codes are specific enough to act on and are distinguished
   * here rather than flattened into "auth failed":
   *
   *   | Situation            | Status | Body                                                    |
   *   | -------------------- | ------ | ------------------------------------------------------- |
   *   | Unknown/revoked token| 403    | `{"error":"ERROR_TOKEN_DOES_NOT_EXIST", …}`             |
   *   | No header at all     | 403    | `{"detail":"Authentication credentials were not provided."}` |
   */
  async test({ credential }, ctx) {
    const cred = credential as Partial<BaserowCredential>;
    if (!cred?.siteUrl) return { ok: false, message: "credential missing siteUrl" };
    if (!cred?.token) return { ok: false, message: "credential missing token" };

    let base: string;
    try {
      base = normalizeSiteUrl(cred.siteUrl);
    } catch (err) {
      return { ok: false, message: (err as Error).message };
    }

    const res = await ctx.fetch(`${base}${PROBE_PATH}`, {
      headers: { accept: "application/json", ...authHeaders(cred) },
    });

    if (!res.ok) {
      const body = await res.json().catch(() => null) as
        | { error?: string; detail?: unknown }
        | null;
      if (body?.error === "ERROR_TOKEN_DOES_NOT_EXIST") {
        return {
          ok: false,
          message:
            "Baserow does not recognise this token. Check it was minted on this instance under " +
            "Settings → Database tokens, and has not been deleted.",
        };
      }
      if (res.status === 401 || res.status === 403) {
        const detail = typeof body?.detail === "string" ? `: ${body.detail}` : "";
        return { ok: false, message: `Baserow rejected the token (${res.status})${detail}` };
      }
      if (res.status === 404) {
        return {
          ok: false,
          message: `No Baserow at this URL — ${PROBE_PATH} is not routed here.`,
        };
      }
      return { ok: false, message: `Baserow returned HTTP ${res.status}` };
    }

    // A 200 that is not a table list means something else is answering on this
    // origin — a reverse proxy's login page, a captive portal, a parked domain.
    // Baserow is very commonly behind exactly such a proxy, so this is not
    // theoretical.
    const tables = await res.json().catch(() => null);
    if (!Array.isArray(tables)) {
      return {
        ok: false,
        message: "Host answered but did not return a Baserow table list — is this URL Baserow?",
      };
    }
    if (tables.length === 0) {
      return {
        ok: false,
        message:
          "The token is valid but can reach no tables. Give it at least read permission on one " +
          "table in Settings → Database tokens.",
      };
    }
    return { ok: true };
  },

  /**
   * Records the instance origin — and how much the token can see — on the
   * Connection, so the client can build URLs and a UI can label the Connection
   * without either ever seeing the token.
   *
   * The table list itself is deliberately **not** republished, only its size and
   * the database ids it spans: a Connection's display block is shown wherever
   * the connection is, and a full table inventory is more of the customer's
   * schema than a label needs.
   */
  async afterConnect({ credential }, ctx) {
    const cred = credential as Partial<BaserowCredential>;
    if (!cred?.siteUrl) return {};

    let siteUrl: string;
    try {
      siteUrl = normalizeSiteUrl(cred.siteUrl);
    } catch {
      return {};
    }

    const display: Record<string, unknown> = {
      siteUrl,
      site: { host: new URL(siteUrl).host },
    };

    const res = await ctx.fetch(`${siteUrl}${PROBE_PATH}`, {
      headers: { accept: "application/json" },
    });
    if (res.ok) {
      const tables = await res.json().catch(() => null) as
        | Array<{ database_id?: number }>
        | null;
      if (Array.isArray(tables)) {
        display.scope = {
          tableCount: tables.length,
          databaseIds: [...new Set(tables.map((t) => t.database_id).filter((id) => id != null))],
        };
      }
    }
    return display;
  },
};

export default databaseToken;
