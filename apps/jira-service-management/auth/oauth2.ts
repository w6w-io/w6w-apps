import type { AuthDefinition } from "@w6w/types";
import { readErrorDetail } from "../lib/client.ts";

/**
 * OAuth 2.0 (3LO) with an Atlassian app — same gateway and cloud-id
 * resolution as the sibling `jira` app's `oauth2` method, because both
 * products live on the same Jira Cloud site. `offline_access` is in the scope
 * list so a refresh token is issued; without it the connection dies after an
 * hour and cannot be used in scheduled runs.
 *
 * Scopes are the fine-grained, JSM-specific grants Atlassian's own OpenAPI
 * document (https://developer.atlassian.com/cloud/jira/service-desk/swagger.json)
 * lists for this exact API surface, rather than the broad classic
 * `read:jira-work` / `write:jira-work` the sibling `jira` app uses for the
 * issue-tracking API — least privilege for the resources this app actually
 * touches (service desks, request types, requests, comments, participants,
 * transitions, SLAs, organizations, queues).
 */
const oauth2: AuthDefinition = {
  key: "oauth2",
  type: "oauth2",
  displayName: "OAuth (Sign in with Atlassian)",
  description:
    "Public OAuth flow. Requires an Atlassian OAuth 2.0 (3LO) app registered on this w6w installation.",
  connectionLabel: "{{siteName}}",
  oauth2: {
    authorizationUrl: "https://auth.atlassian.com/authorize",
    tokenUrl: "https://auth.atlassian.com/oauth/token",
    refreshUrl: "https://auth.atlassian.com/oauth/token",
    scopes: [
      "read:servicedesk:jira-service-management",
      "read:requesttype:jira-service-management",
      "read:request:jira-service-management",
      "write:request:jira-service-management",
      "read:request.comment:jira-service-management",
      "write:request.comment:jira-service-management",
      "read:request.participant:jira-service-management",
      "write:request.participant:jira-service-management",
      "read:request.status:jira-service-management",
      "write:request.status:jira-service-management",
      "read:request.sla:jira-service-management",
      "read:organization:jira-service-management",
      "read:queue:jira-service-management",
      // Without this Atlassian issues no refresh token and the connection
      // expires in an hour.
      "offline_access",
    ],
    extraAuthParams: { audience: "api.atlassian.com", prompt: "consent" },
    pkce: true,
  },

  sign({ request, credential }) {
    const { accessToken } = credential as { accessToken: string };
    request.headers["authorization"] = `Bearer ${accessToken}`;
    return request;
  },

  async test({ credential }, ctx) {
    const { accessToken } = credential as { accessToken?: string };
    if (!accessToken) return { ok: false, message: "credential missing accessToken" };
    const res = await ctx.fetch("https://api.atlassian.com/oauth/token/accessible-resources", {
      headers: { authorization: `Bearer ${accessToken}`, accept: "application/json" },
    });
    if (!res.ok) return { ok: false, message: await readErrorDetail(res) };
    const sites = await res.json().catch(() => []) as unknown[];
    if (!Array.isArray(sites) || sites.length === 0) {
      return { ok: false, message: "the token grants access to no Jira site" };
    }
    return { ok: true };
  },

  /**
   * Resolves the cloud id, then confirms THIS product (JSM, not just Jira
   * Software) is actually reachable there by hitting its own `/info` — a
   * Jira Cloud site can exist without Jira Service Management provisioned on
   * it, which a generic Jira accessible-resources check would never catch.
   * Only the FIRST accessible site is used — an app granted several needs one
   * Connection per site, which is the honest model given a Connection carries
   * a single cloud id.
   */
  async afterConnect(_input, ctx) {
    const res = await ctx.fetch("https://api.atlassian.com/oauth/token/accessible-resources");
    if (!res.ok) return {};
    const sites = await res.json().catch(() => []) as Array<{
      id?: string;
      name?: string;
      url?: string;
    }>;
    const first = Array.isArray(sites) ? sites[0] : undefined;
    if (!first?.id) return {};

    const info = await ctx.fetch(
      `https://api.atlassian.com/ex/jira/${first.id}/rest/servicedeskapi/info`,
    );
    const jsm = info.ok
      ? await info.json().catch(() => ({})) as { isLicensedForUse?: boolean; version?: string }
      : undefined;

    return {
      cloudId: first.id,
      siteName: first.name,
      siteUrl: first.url,
      jsmLicensed: jsm?.isLicensedForUse,
    };
  },
};

export default oauth2;
