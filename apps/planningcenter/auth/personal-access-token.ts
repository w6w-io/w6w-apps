import type { AuthDefinition } from "@w6w/types";
import { classifyAuthFailure, HOST, USER_AGENT } from "../lib/client.ts";

/**
 * Personal Access Token — a `client_id`/`secret` pair, sent as HTTP Basic in
 * the CONVENTIONAL order (`Authorization: Basic base64(client_id:secret)`).
 *
 * Verified against Planning Center's own OpenAPI security scheme
 * (`securitySchemes.personal_access_token`, every product document, fetched
 * 2026-09-05): `"type": "http", "scheme": "basic"`, described in the schema
 * itself as "Provide your Personal Access Token Client ID as the HTTP Basic
 * username and your Secret as the HTTP Basic password." The Authentication
 * guide's own `curl` example confirms the same order:
 * `curl -u client_id:secret https://api.planningcenteronline.com/people/v2/people`.
 *
 * A PAT authenticates as the user who created it, with that user's own
 * People/Giving/Calendar/etc. permissions, and reaches every product API at
 * once — there is no per-product scope to request the way OAuth2 has one.
 * That is also its limit: it is documented as usable only for a single
 * organization's own integrations ("You may not use a Personal Access Token
 * if you are integrating with multiple churches—instead use OAuth"). OAuth2
 * is deliberately not implemented here: distributing an OAuth app across
 * multiple churches requires Planning Center to issue a `client_id`/
 * `client_secret` by hand to a registered organization, which is an
 * out-of-band approval, not a config value this app package can carry. See
 * the README.
 */

export interface PlanningCenterCredential {
  clientId: string;
  secret: string;
}

/** The one place the wire format is built, so `sign` and `test` never drift apart. */
export function basicHeader(credential: Partial<PlanningCenterCredential>): string {
  return `Basic ${btoa(`${credential.clientId ?? ""}:${credential.secret ?? ""}`)}`;
}

/**
 * `GET /current/v2/me` — the Current API's identity endpoint, which the
 * Authentication guide states explicitly is "available to all OAuth
 * applications without requiring any scopes and without imposing any access
 * or permission rules" beyond being logged in at all. For a PAT that same
 * product-neutral behavior makes it the narrowest possible probe: it proves
 * the client_id/secret pair authenticates, without needing People, Giving,
 * Calendar or any other product's own permission grant, and without touching
 * a product-scoped endpoint that a legitimately restricted user could fail
 * for a reason that has nothing to do with the credential.
 *
 * The response is a single `Person` JSON-API resource (name, avatar, id) —
 * never credential material.
 */
export const PROBE_URL = `https://${HOST}/current/v2/me`;

const personalAccessToken: AuthDefinition = {
  key: "personal-access-token",
  type: "basic",
  displayName: "Personal Access Token",
  description:
    "A Client ID + Secret pair from your Planning Center Developer Account, sent as HTTP Basic. " +
    "Authenticates as the user who created it, across every Planning Center product that user " +
    "can access. For a single organization only — see the README for why OAuth2 is not offered.",
  fields: [
    {
      key: "clientId",
      label: "Client ID",
      type: "secret",
      required: true,
      row: "creds",
      hint: "From your Developer Account (api.planningcenteronline.com/oauth/applications) — " +
        '"Personal Access Tokens".',
    },
    {
      key: "secret",
      label: "Secret",
      type: "secret",
      required: true,
      row: "creds",
      hint: "Shown once at creation time. Planning Center cannot show it again — issue a new " +
        "token if it was lost.",
    },
  ],

  /** The only hook given the raw credential; network-less, so it only stamps the header. */
  sign({ request, credential }) {
    request.headers["authorization"] = basicHeader(credential as Partial<PlanningCenterCredential>);
    request.headers["user-agent"] ??= USER_AGENT;
    return request;
  },

  /** See {@link PROBE_URL} for why `/current/v2/me` and not a product-scoped read. */
  async test({ credential }, ctx) {
    const cred = credential as Partial<PlanningCenterCredential>;
    const clientId = (cred?.clientId ?? "").trim();
    const secret = (cred?.secret ?? "").trim();
    if (!clientId || !secret) {
      return { ok: false, message: "credential missing clientId or secret" };
    }

    const res = await ctx.fetch(PROBE_URL, {
      headers: {
        accept: "application/json",
        "user-agent": USER_AGENT,
        authorization: basicHeader({ clientId, secret }),
      },
    });
    if (res.ok) return { ok: true };

    const message = classifyAuthFailure(res.status) ??
      `Planning Center returned ${res.status} for ${PROBE_URL}`;
    return { ok: false, message };
  },

  /**
   * Labels the connection with the token owner's own name — the only identity
   * `/current/v2/me` exposes, and the same field a Connections list would
   * otherwise show as an undifferentiated "Planning Center" for every PAT.
   */
  async afterConnect({ credential }, ctx) {
    const { clientId, secret } = credential as PlanningCenterCredential;
    const res = await ctx.fetch(PROBE_URL, {
      headers: {
        accept: "application/json",
        "user-agent": USER_AGENT,
        authorization: basicHeader({ clientId, secret }),
      },
    });
    if (!res.ok) return {};
    const body = await res.json().catch(() => null) as
      | { data?: { attributes?: { name?: string } } }
      | null;
    const name = body?.data?.attributes?.name;
    return name ? { label: `Planning Center (${name})` } : {};
  },
};

export default personalAccessToken;
