import type { AuthDefinition } from "@w6w/types";
import { API_BASE, API_PREFIX, formatAgencyZoomError } from "../lib/client.ts";

/**
 * A username and password, exchanged once for a JWT.
 *
 * ## Why this is `custom` and not `basic`
 *
 * AgencyZoom does not accept the username/password on every request the way
 * HTTP Basic would. `POST /v1/api/auth/login` takes `{username, password}` and
 * returns `{jwt, ownerAgent}`; every subsequent call carries that JWT as
 * `Authorization: Bearer <jwt>`. The credential the user types is therefore
 * not the credential that signs requests — the same shape as an OAuth
 * password grant, minus the OAuth machinery — so this is `custom` with an
 * `exchange` hook, not `basic`.
 *
 * ## There is no documented refresh, and no documented expiry
 *
 * The OpenAPI document names a `logout` endpoint but no `refresh` endpoint and
 * no `expiresIn`/`expiresAt` field on `LoginResponse`. `refresh` below
 * therefore does the only thing available: it re-runs the same login exchange
 * with the stored username and password, which is why the password is kept in
 * the credential rather than discarded after `exchange` — see Bluesky's
 * `app-password.ts` for the same shape, minted for a different reason (a
 * rate-limited session-creation endpoint rather than a missing refresh route).
 *
 * ## An undocumented `jwtrefresh` response header exists, and this app does not use it
 *
 * A live probe against `POST /v1/api/auth/login` on 2026-09-05 returned
 * `access-control-expose-headers: jwtrefresh` — the server explicitly CORS-
 * allowlists a response header named `jwtrefresh` that appears nowhere in the
 * OpenAPI document. That is circumstantial evidence AgencyZoom's own web app
 * silently rotates the JWT on some calls via that header, but with no
 * documented shape or trigger condition to verify against, depending on it
 * here would be guessing at an undocumented contract. This app authenticates
 * the boring, verifiable way instead: re-login on demand.
 *
 * ## `permissions afforded to the caller are the same as those for the logged in user`
 *
 * That is the vendor's own words from the document's introduction. There is no
 * scoped/service-account credential — whichever human's username and password
 * are used here, the Connection can do everything that person can do in the
 * product. The document itself recommends using the **agency owner's** login
 * "if the integrated applications would like to access all the
 * functionalities."
 */
export interface AgencyZoomCredential {
  username: string;
  password: string;
  jwt: string;
  ownerAgent?: boolean;
}

interface LoginResponse {
  jwt?: string;
  ownerAgent?: boolean;
}

/**
 * `POST /v1/api/auth/login`. Shared by `exchange` and `refresh` — both spend
 * the same one call, so there is exactly one place that builds it.
 */
async function loginRequest(
  username: string,
  password: string,
  ctx: { fetch: typeof fetch },
): Promise<AgencyZoomCredential> {
  const res = await ctx.fetch(`${API_BASE}${API_PREFIX}/auth/login`, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({ username, password }),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(formatAgencyZoomError(res.status, "POST", "/v1/api/auth/login", text));
  }
  const body = JSON.parse(text || "{}") as LoginResponse;
  if (!body.jwt) throw new Error("AgencyZoom login succeeded but returned no jwt");
  return { username, password, jwt: body.jwt, ownerAgent: body.ownerAgent };
}

/**
 * `POST /v1/api/policies/create` documents a SECOND, undocumented-origin
 * header requirement alongside `bearer` security: a required `X-Api-Token`
 * header with no described source, present on no other endpoint in the
 * document (confirmed: exactly one `grep` hit across all 316 KB). There is no
 * separate "API token" concept anywhere else in this API — no field on
 * `LoginResponse`, no settings-page token, nothing — so the only credential
 * material this app has to offer that header is the same JWT already signing
 * the request. `sign` stamps it there, and only there, so a reader auditing
 * `sign` for "does this app ever put a credential somewhere unusual" finds the
 * answer next to the one action that needs it, not from a bare `if`.
 */
const POLICY_CREATE_PATH = `${API_PREFIX}/policies/create`;

const login: AuthDefinition = {
  key: "login",
  type: "custom",
  displayName: "Username & Password",
  description:
    "Your AgencyZoom login email and password. AgencyZoom's own guidance: use the agency " +
    "owner's login for a connection that needs access to everything.",
  connectionLabel: "AgencyZoom ({{username}})",
  fields: [
    {
      key: "username",
      label: "Email",
      type: "string",
      required: true,
      hint: "The email you use to sign in to AgencyZoom.",
    },
    {
      key: "password",
      label: "Password",
      type: "secret",
      required: true,
    },
  ],

  async exchange({ fields }, ctx) {
    const f = (fields ?? {}) as Record<string, unknown>;
    const username = String(f.username ?? "").trim();
    const password = String(f.password ?? "");
    if (!username) throw new Error("`username` is required");
    if (!password) throw new Error("`password` is required");
    return await loginRequest(username, password, ctx);
  },

  sign({ request, credential }) {
    const { jwt } = credential as Partial<AgencyZoomCredential>;
    if (jwt) request.headers["authorization"] = `Bearer ${jwt}`;
    // See POLICY_CREATE_PATH above: the one endpoint that also demands this
    // undocumented header, stamped with the same JWT.
    if (jwt && request.url.includes(POLICY_CREATE_PATH)) {
      request.headers["x-api-token"] = jwt;
    }
    return request;
  },

  /** No refresh endpoint exists — re-run the login exchange. */
  async refresh({ credential }, ctx) {
    const cred = credential as Partial<AgencyZoomCredential>;
    const username = String(cred.username ?? "");
    const password = String(cred.password ?? "");
    if (!username || !password) {
      throw new Error("credential has no stored username/password — reconnect the account");
    }
    return await loginRequest(username, password, ctx);
  },

  /**
   * `GET /v1/api/employees` — the cheapest authenticated read in the surface.
   * It needs a credential, returns no secret, and (unlike `/v1/api/profile/my`,
   * which the document only exposes as a `PUT`) it exists as a `GET`. A garbage
   * or missing bearer answers the undocumented `401 {"name":"Unauthorized",…}`
   * shape measured live — see `lib/client.ts` for why that is checked
   * separately from the documented `{"error", "fieldErrors"}` shape.
   */
  async test({ credential }, ctx) {
    const { jwt } = (credential ?? {}) as Partial<AgencyZoomCredential>;
    if (!jwt) return { ok: false, message: "credential missing jwt — reconnect the account" };

    let res: Response;
    try {
      res = await ctx.fetch(`${API_BASE}${API_PREFIX}/employees`, {
        headers: { accept: "application/json", authorization: `Bearer ${jwt}` },
      });
    } catch (err) {
      return { ok: false, message: `could not reach AgencyZoom: ${String(err)}` };
    }
    if (res.ok) return { ok: true };

    const text = await res.text().catch(() => "");
    if (res.status === 401) {
      return {
        ok: false,
        message: "AgencyZoom rejected the session (401) — the JWT expired or was revoked. " +
          "Reconnect the account.",
      };
    }
    return {
      ok: false,
      message: formatAgencyZoomError(res.status, "GET", "/v1/api/employees", text),
    };
  },

  /** Nothing more to fetch — `exchange` already captured everything the label needs. */
  afterConnect({ credential }) {
    const cred = (credential ?? {}) as Partial<AgencyZoomCredential>;
    return { username: cred.username, ownerAgent: cred.ownerAgent };
  },

  /**
   * `POST /v1/api/auth/logout`. Best-effort: the document does not mark this
   * endpoint `security: bearer`, so whether it even needs the token being
   * revoked is unverified, and a disconnect must succeed locally regardless of
   * what the vendor does with the (already being discarded) session.
   */
  async revoke({ credential }, ctx) {
    const { jwt } = (credential ?? {}) as Partial<AgencyZoomCredential>;
    if (!jwt) return;
    try {
      await ctx.fetch(`${API_BASE}${API_PREFIX}/auth/logout`, {
        method: "POST",
        headers: { accept: "application/json", authorization: `Bearer ${jwt}` },
      });
    } catch {
      // Disconnecting locally must succeed even if AgencyZoom is unreachable.
    }
  },
};

export default login;
