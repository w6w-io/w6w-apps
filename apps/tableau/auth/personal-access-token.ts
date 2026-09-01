import type { AuthDefinition } from "@w6w/types";
import {
  DEFAULT_API_VERSION,
  normalizeBaseUrl,
  signIn,
  signOut,
  type TableauCredential,
  tableauErrorMessage,
} from "../lib/client.ts";

/**
 * Personal Access Token — exchanged for a short-lived session at connect
 * time, and again whenever that session idles out.
 *
 * ## Tableau's PAT is not a bearer credential
 *
 * Unlike most API-key apps in this pack, a Tableau PAT cannot be stamped
 * straight onto a request. It has to be traded, via `POST /auth/signin`, for
 * a session `token` (sent back as `X-Tableau-Auth`) plus the LUID of the site
 * signed into — verified against the vendor's "Sign In" reference page. That
 * session is what every other call actually authenticates with, and it
 * expires: **240 minutes on Tableau Server, 120 on Tableau Cloud** (both
 * configurable server/site-side), after which Tableau answers 401 until a
 * fresh sign-in happens.
 *
 * So the credential this app stores carries both halves: the durable PAT
 * (`patName`/`patSecret`, needed to sign in again) and the live session
 * (`token`/`siteId`/`userId`/`expiresAt`, needed for every other request).
 * `sign` only ever stamps the session half; `refresh` re-runs the sign-in
 * exactly like `exchange` did, because Tableau has no separate "refresh
 * token" grant for a PAT session — signing in again *is* the refresh.
 *
 * ## The site is part of the credential, not a per-action parameter
 *
 * A Tableau session is scoped to exactly one site — "you cannot sign in to
 * one site and then use the credentials token you get back to send requests
 * to a different site" (the vendor's own wording; it answers 403 if you try).
 * So `siteContentUrl` is asked for at connect time, and every action reads
 * the resulting `siteId` off the connection rather than taking it as a
 * parameter a workflow could get wrong.
 */
const personalAccessToken: AuthDefinition = {
  key: "personal-access-token",
  type: "custom",
  displayName: "Personal Access Token",
  description: "A Personal Access Token from your Tableau account (Settings → Personal Access " +
    "Tokens), plus the server address and site. The token name and secret sign in to get a " +
    "session; this app re-signs-in automatically once that session idles out.",
  connectionLabel: "{{siteContentUrl}} @ {{baseUrl}}",
  fields: [
    {
      key: "baseUrl",
      label: "Server URL",
      type: "string",
      required: true,
      placeholder: "https://10ax.online.tableau.com",
      hint: "Tableau Cloud: your pod's URL (from the browser address bar after signing in), e.g. " +
        "`10ax.online.tableau.com` or `us-east-1.online.tableau.com`. Tableau Server: your " +
        "organization's own server address. A URL without a scheme is assumed to be https.",
    },
    {
      key: "siteContentUrl",
      label: "Site",
      type: "string",
      default: "",
      hint: "The site's contentUrl segment — the part of the URL after `/#/site/` when browsing " +
        "Tableau. Leave blank for Tableau Server's default site (Tableau Cloud always requires a " +
        "site name here).",
    },
    {
      key: "patName",
      label: "Personal Access Token Name",
      type: "string",
      required: true,
      row: "pat",
      hint: "My Account Settings → Personal Access Tokens → Create a new token.",
    },
    {
      key: "patSecret",
      label: "Personal Access Token Secret",
      type: "secret",
      required: true,
      row: "pat",
      hint: "Shown once when the token is created.",
    },
    {
      key: "apiVersion",
      label: "REST API Version",
      type: "string",
      default: DEFAULT_API_VERSION,
      advanced: true,
      hint: "Rarely needs changing. Lower it if your Tableau Server predates this version.",
    },
  ],

  /** Trades the PAT for a live session. See the file header for why both halves are stored. */
  async exchange({ fields }, ctx) {
    const f = (fields ?? {}) as Record<string, unknown>;
    const baseUrl = String(f.baseUrl ?? "").trim();
    const siteContentUrl = String(f.siteContentUrl ?? "").trim();
    const patName = String(f.patName ?? "").trim();
    const patSecret = String(f.patSecret ?? "").trim();
    const apiVersion = String(f.apiVersion ?? "").trim() || DEFAULT_API_VERSION;
    if (!baseUrl) throw new Error("Server URL is required");
    if (!patName || !patSecret) {
      throw new Error("Personal Access Token Name and Secret are both required");
    }

    const normalized = normalizeBaseUrl(baseUrl);
    const result = await signIn(ctx, {
      baseUrl: normalized,
      siteContentUrl,
      patName,
      patSecret,
      apiVersion,
    });

    const credential: TableauCredential = {
      baseUrl: normalized,
      siteContentUrl,
      patName,
      patSecret,
      apiVersion,
      token: result.token,
      siteId: result.siteId,
      userId: result.userId,
      expiresAt: result.expiresAt,
    };
    return credential;
  },

  /**
   * Re-signs in with the stored PAT. Tableau has no token-refresh grant for a
   * session — a new `auth/signin` call is what "refreshing" means here.
   */
  async refresh({ credential }, ctx) {
    const cred = credential as Partial<TableauCredential>;
    if (!cred.baseUrl || !cred.patName || !cred.patSecret) {
      throw new Error("credential is missing baseUrl, patName or patSecret — reconnect");
    }
    const apiVersion = cred.apiVersion || DEFAULT_API_VERSION;
    const result = await signIn(ctx, {
      baseUrl: cred.baseUrl,
      siteContentUrl: cred.siteContentUrl ?? "",
      patName: cred.patName,
      patSecret: cred.patSecret,
      apiVersion,
    });
    const refreshed: TableauCredential = {
      baseUrl: cred.baseUrl,
      siteContentUrl: cred.siteContentUrl ?? "",
      patName: cred.patName,
      patSecret: cred.patSecret,
      apiVersion,
      token: result.token,
      siteId: result.siteId,
      userId: result.userId,
      expiresAt: result.expiresAt,
    };
    return refreshed;
  },

  /** The only hook that stamps the session token. Runs network-less. */
  sign({ request, credential }) {
    const { token } = credential as Partial<TableauCredential>;
    request.headers["x-tableau-auth"] = token ?? "";
    return request;
  },

  /**
   * `GET /sites/{siteId}/projects?pageSize=1` — the narrowest authenticated
   * call any signed-in user can make. Unlike `GET /sites/{siteId}` (Query
   * Site) or `GET /sites/{siteId}/users/{userId}`, listing projects requires
   * no server/site-administrator permission — a non-admin PAT with zero
   * visible projects still gets a 200 with an empty list, never a 403.
   */
  async test({ credential }, ctx) {
    const cred = credential as Partial<TableauCredential>;
    if (!cred.token) {
      return { ok: false, message: "credential missing a session token — reconnect" };
    }
    if (!cred.baseUrl) return { ok: false, message: "credential missing baseUrl" };
    if (!cred.siteId) return { ok: false, message: "credential missing siteId — reconnect" };

    let base: string;
    try {
      base = normalizeBaseUrl(cred.baseUrl);
    } catch (err) {
      return { ok: false, message: String((err as Error).message) };
    }
    const apiVersion = cred.apiVersion || DEFAULT_API_VERSION;

    let res: Response;
    try {
      res = await ctx.fetch(
        `${base}/api/${apiVersion}/sites/${cred.siteId}/projects?pageSize=1`,
        { headers: { "x-tableau-auth": cred.token, accept: "application/json" } },
      );
    } catch (err) {
      return { ok: false, message: `Tableau server unreachable: ${String(err)}` };
    }

    if (res.status === 401) {
      return {
        ok: false,
        message: "Tableau rejected the session (401) — it has likely idled out; reconnecting " +
          "signs in again",
      };
    }
    if (res.status === 403) {
      return {
        ok: false,
        message: "the session is valid but this account cannot list projects (403) — check the " +
          "site and account",
      };
    }
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return { ok: false, message: tableauErrorMessage(res.status, res.statusText, text) };
    }
    return { ok: true };
  },

  /** Records the server, site and account. Never the PAT secret or the session token. */
  afterConnect({ credential }, _ctx) {
    const cred = credential as Partial<TableauCredential>;
    if (!cred.baseUrl || !cred.siteId) return {};
    return {
      baseUrl: normalizeBaseUrl(cred.baseUrl),
      siteContentUrl: cred.siteContentUrl ?? "",
      siteId: cred.siteId,
      userId: cred.userId,
      apiVersion: cred.apiVersion || DEFAULT_API_VERSION,
    };
  },

  /** `POST /auth/signout`. Best effort — a disconnect must succeed even if the server is down. */
  async revoke({ credential }, ctx) {
    const cred = credential as Partial<TableauCredential>;
    if (!cred.baseUrl || !cred.token) return;
    await signOut(ctx, {
      baseUrl: cred.baseUrl,
      apiVersion: cred.apiVersion || DEFAULT_API_VERSION,
      token: cred.token,
    });
  },
};

export default personalAccessToken;
