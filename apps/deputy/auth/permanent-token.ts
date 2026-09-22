import type { AuthDefinition } from "@w6w/types";
import {
  API_PATH,
  errorMessage,
  host,
  normalizeBaseUrl,
  parseInstall,
  sameHost,
} from "../lib/client.ts";

interface PermanentTokenCredential {
  baseUrl?: string;
  token?: string;
}

/**
 * A Deputy install URL plus a **Permanent Token**, sent as
 * `Authorization: Bearer {token}`.
 *
 * ## Why a permanent token and not Deputy's OAuth2 flow
 *
 * Deputy documents two ways in, and its own "Using a Permanent Token" page
 * describes the second one exactly as what this app needs: *"A permanent token
 * is an option best suited to those building a custom application for one or
 * two Deputy installs or for an internal system connection of the Deputy
 * customer."* Minting one is a two-step admin action inside the customer's own
 * install —
 * `https://{install}.{geo}.deputy.com/exec/devapp/oauth_clients` → **New
 * OAuth Client** → **Get an Access Token** — and the page states the token is
 * displayed **once** and is revocable from that same screen.
 *
 * The alternative, "Using Oauth 2.0", is a browser authorization-code dance
 * (`once.deputy.com/my/oauth/login` → `once.deputy.com/my/oauth/access_token`)
 * with 24-hour access tokens and rotating refresh tokens, intended for
 * published apps where "hundreds if not thousands" of Deputy users each consent
 * through a UI. An unattended workflow has no browser and no consent screen, so
 * that flow is out of scope here for the same reason it is in `mautic`, `gitea`
 * and the rest of this pack's single-token apps.
 *
 * ## The install URL is half the credential
 *
 * A Deputy token is meaningless without the install it was minted in: the token
 * is bound to one install ("the relationship between an access token and Deputy
 * install is one-to-one"). Both are collected together, and the URL is
 * normalised once at connect time.
 *
 * ## Validating the token
 *
 * Deputy's own docs name the probe twice — *"An easy way to do this is to make
 * an API request to the Who am i endpoint … `GET
 * https://{deputyinstall}.{geo}.deputy.com/api/v1/me`"* — so that is what
 * `test` calls. What Deputy returns for a *bad* token was verified live on
 * 2026-09-22 against the install Deputy's own guides use as their example
 * (`simonssambos.au.deputy.com`):
 *
 *   | Request                                            | Status | Body                                               |
 *   | -------------------------------------------------- | ------ | -------------------------------------------------- |
 *   | no `Authorization` header                          | **403**| `{"error":{"code":403,"message":"No authorization given"}}` |
 *   | `Authorization: Bearer` (empty)                    | **400**| `{"error":"invalid_request"}`                      |
 *   | `Authorization: Bearer not-a-real-token`           | **401**| *(zero bytes, `text/html`)*                        |
 *
 * The classification below reads the **body** first and treats the status as a
 * hint, the rule this pack learned from Follow Up Boss and Mailjet: a rejected
 * token is a 401 **with an empty body**, and a 403 whose body says
 * "No authorization given" means the header never reached Deputy at all — a
 * different problem with a different fix (a proxy or an auth-less posture
 * stripped it) than a revoked or rotated token.
 *
 * ## What this hook deliberately does *not* do
 *
 * `/api/v1/me` answers the caller's own user record, but Deputy's reference
 * page for it now redirects to the getting-started guide, so the **200 body is
 * not documented anywhere** and could not be captured without a live
 * credential. Nothing from a 200 body is therefore stored on the Connection:
 * `afterConnect` labels the Connection from the install URL alone (install +
 * region), and `test` never surfaces a body. If Deputy ever started echoing the
 * token back from `/me`, no part of this app would copy it anywhere.
 */
const permanentToken: AuthDefinition = {
  key: "permanent-token",
  type: "custom",
  displayName: "Permanent Token",
  description: "A Deputy install URL plus a permanent token minted in that install. Sent as " +
    "`Authorization: Bearer …`, exactly as Deputy's own authentication pages document.",
  connectionLabel: "{{install}} · {{region}}",
  fields: [
    {
      key: "baseUrl",
      label: "Deputy install URL",
      type: "string",
      required: true,
      placeholder: "https://simonssambos.au.deputy.com",
      hint: "Your install's own address — `https://{install}.{geo}.deputy.com`, where `{geo}` is " +
        "au, eu, uk or us. It is also the API host: there is no separate `api.` subdomain.",
    },
    {
      key: "token",
      label: "Permanent Token",
      type: "secret",
      required: true,
      hint:
        "In your install: /exec/devapp/oauth_clients → New OAuth Client → Get an Access Token. " +
        "Deputy shows it once — this is a per-install credential with no expiry, so treat it " +
        "like a password and revoke it from that same page when it is no longer needed.",
    },
  ],

  /**
   * The only hook that stamps the token. Runs network-less: it mutates the
   * request and returns it. `Bearer` is the scheme Deputy documents on both of
   * its authentication pages.
   */
  sign({ request, credential }) {
    const { token } = credential as PermanentTokenCredential;
    request.headers["authorization"] = `Bearer ${token ?? ""}`;
    return request;
  },

  async test({ credential }, ctx) {
    const cred = credential as PermanentTokenCredential;
    if (!cred?.token) return { ok: false, message: "credential missing a permanent token" };
    if (!cred?.baseUrl) return { ok: false, message: "credential missing the install URL" };

    let base: string;
    try {
      base = normalizeBaseUrl(cred.baseUrl);
    } catch (err) {
      return { ok: false, message: String((err as Error).message) };
    }

    let res: Response;
    try {
      res = await ctx.fetch(`${base}${API_PATH}/me`, {
        headers: { accept: "application/json", authorization: `Bearer ${cred.token}` },
      });
    } catch (err) {
      return { ok: false, message: `could not reach ${base}: ${String(err)}` };
    }
    const text = await res.text().catch(() => "");

    // A hostname that is not a Deputy install answers 302 → once.deputy.com/my/
    // (verified live), and fetch follows it to a login page that answers 200
    // HTML. Catch that before the status checks, or a typo'd URL reads as a
    // live credential.
    if (res.url && !sameHost(res.url, base)) {
      return {
        ok: false,
        message: `that URL is not a Deputy install — ${base} redirected to ${host(res.url)}. ` +
          "Check the install name and region in your install's own URL " +
          "(https://{install}.{geo}.deputy.com).",
      };
    }

    if (res.status === 401) {
      return {
        ok: false,
        message:
          "Deputy rejected the token (401). Deputy answers an unrecognised token with a bare " +
          "401 and an empty body, so there is no message to quote: the token may have been " +
          "revoked or rotated at /exec/devapp/oauth_clients, or it belongs to a different " +
          "Deputy install than the URL above.",
      };
    }
    if (res.status === 400 && /invalid_request/i.test(text)) {
      return {
        ok: false,
        message: "Deputy saw the Authorization header but no usable token in it (400 " +
          "`invalid_request`) — the token field looks empty or malformed.",
      };
    }
    if (res.status === 403) {
      const detail = errorMessage(text);
      const noAuth = /no authorization/i.test(detail);
      return {
        ok: false,
        message: `Deputy refused the request (403${detail ? `: ${detail}` : ""}).` +
          (noAuth
            ? " That is Deputy's answer when it receives no Authorization header at all, so " +
              "the token never reached it — check for a proxy stripping the header."
            : " The token reached Deputy but this install would not authorise it."),
      };
    }
    if (!res.ok) {
      return {
        ok: false,
        message: `Deputy answered ${res.status}${
          errorMessage(text) ? `: ${errorMessage(text)}` : ""
        }`,
      };
    }

    // Status 200 is not the answer on its own — Deputy documents that
    // "returned data is always in a JSON format", so a 200 that is not JSON is
    // something else answering in front of Deputy, and must not pass as a live
    // credential. The parsed body is deliberately discarded: its shape is
    // undocumented (see the header) and nothing here needs to read it.
    try {
      JSON.parse(text || "null");
    } catch {
      return {
        ok: false,
        message: `${base} answered 200 but not with JSON (${
          res.headers.get("content-type") ?? "no content-type"
        }) — that looks like a proxy or login page, not the Deputy API.`,
      };
    }
    return { ok: true };
  },

  /**
   * Labels the Connection from the install URL alone — install name and region
   * parsed out of the host, with no request. Never records the token, and never
   * copies anything out of a `/me` body (see the header for why that body is
   * deliberately not trusted here).
   */
  afterConnect({ credential }) {
    const cred = credential as PermanentTokenCredential;
    if (!cred?.baseUrl) return {};
    let base: string;
    try {
      base = normalizeBaseUrl(cred.baseUrl);
    } catch {
      return {};
    }
    const { install, region } = parseInstall(base);
    return { baseUrl: base, install, region };
  },
  // No `revoke`: a permanent token is revoked from the install's own admin page
  // (/exec/devapp/oauth_clients), which is not exposed over the API this app can
  // reach. Deputy documents no token-revocation endpoint for it.
};

export default permanentToken;
