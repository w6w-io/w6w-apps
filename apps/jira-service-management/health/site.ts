/**
 * Is Jira Service Management actually provisioned and reachable on THIS
 * connection's site?
 *
 * Annotation, and why each axis is what it is:
 *
 *   - `kind: "dependency"` — the vendor platform is covered by `service`
 *     (jira-service-management.status.atlassian.com). This is the narrower
 *     question of whether THIS tenant's site serves JSM at all, which a
 *     cross-tenant status page cannot tell you.
 *   - `scope: "connection"` — every Connection points at a different site (or
 *     resolves a different cloud id).
 *   - `credential: "context"` — the URL comes from the Connection's display
 *     data (recorded by either auth method's `afterConnect`), and no
 *     credential is needed to interpret the answer. `sign` must not run.
 *   - No `network.allow` is declared: `*.atlassian.net` / `api.atlassian.com`
 *     are already on the app's allowlist, and a `context` check is unsigned
 *     regardless.
 *   - `severity` defaults to `degraded` for this kind.
 *
 * `GET /rest/servicedeskapi/info` is documented "Permissions required: None,
 * the user does not need to be logged in" — verified live (2026-09-05)
 * against `ecosystem.atlassian.net`, `support.atlassian.net` and
 * `jira.atlassian.com`, all 200 with no credential.
 *
 * The response's `isLicensedForUse` is a genuine, JSM-specific fact this
 * check would otherwise have no way to surface: measured live, a real Jira
 * Cloud site (`support.atlassian.net`) answers 200 with
 * `isLicensedForUse: false` — the site exists and is serving, but Jira
 * Service Management itself is not purchased/enabled there, a completely
 * different problem from "the site is down" or "the credential expired" (the
 * derived `auth:*` check).
 */
import type { HealthCheckDefinition } from "@w6w/types";

const site: HealthCheckDefinition = {
  key: "site",
  title: "Jira Service Management site reachable",
  description:
    "Unauthenticated GET /rest/servicedeskapi/info against this connection's Atlassian site — proves the site exists, is serving, and has JSM licensed.",
  kind: "dependency",
  scope: "connection",
  credential: "context",
  covers: ["*"],
  minIntervalSeconds: 120,

  async check(_input, ctx) {
    // `display` is redacted Connection metadata — never the credential. The
    // api-token method records a bare site name; OAuth records a resolved URL.
    const display = (ctx.connection?.display ?? {}) as { site?: string; siteUrl?: string };
    const base = display.siteUrl?.replace(/\/+$/, "") ??
      (display.site ? `https://${display.site}.atlassian.net` : undefined);
    if (!base) {
      return {
        state: "unknown",
        message:
          "connection records no site — an OAuth connection resolves one only after its first token",
      };
    }

    const res = await ctx.fetch(`${base}/rest/servicedeskapi/info`);
    if (!res.ok) return { state: "down", message: `site returned ${res.status}` };

    const body = await res.json().catch(() => ({})) as {
      isLicensedForUse?: boolean;
      version?: string;
    };
    if (body.isLicensedForUse === false) {
      return {
        state: "down",
        message: "site is serving but Jira Service Management is not licensed on it",
        ttlSeconds: 120,
      };
    }
    return {
      state: "ok",
      message: body.version ? `JSM ${body.version}` : "site answered",
      ttlSeconds: 120,
    };
  },
};

export default site;
