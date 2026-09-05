/**
 * Is this connection's Kommo account reachable?
 *
 * Annotation:
 *
 *   - `kind: "dependency"` — `service` above is a declared absence, so this
 *     is the one automatic signal available: does THIS account's host
 *     answer at all.
 *   - `scope: "connection"` — every Connection points at a different
 *     account, on either `.kommo.com` or the legacy `.amocrm.com`.
 *   - `credential: "context"` — the check needs the Connection to know which
 *     host to call, and needs no credential to interpret the answer. `sign`
 *     must not run.
 *   - No `network.allow` is declared: both `*.kommo.com` and `*.amocrm.com`
 *     are already on the app's allowlist, and a `context` check is unsigned
 *     regardless.
 *
 * The probe is deliberately unauthenticated, so a **401 is a pass** — proven
 * against Kommo's own `http-codes` doc, whose 401 example body is the
 * `application/problem+json` envelope `{"title":"Unauthorized", ...}` rather
 * than a silent 200 or a generic gateway error. That proves the host resolves,
 * TLS terminates, and Kommo's own API is answering in its own documented
 * shape — exactly what this check is for. Whether the credential is any good
 * is the derived `auth:*` check's job, and conflating the two is how "the
 * long-lived token expired" gets misreported as "the account is down".
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { accountDomainFromConnection, API_PATH } from "../lib/client.ts";

const account: HealthCheckDefinition = {
  key: "account",
  title: "Account address reachable",
  description:
    "Unauthenticated request to this connection's own Kommo account. A structured 401 passes — " +
    "it proves the account is serving; credential validity is the auth:* check's job.",
  kind: "dependency",
  scope: "connection",
  credential: "context",
  covers: ["*"],
  minIntervalSeconds: 120,

  async check(_input, ctx) {
    let domain: string;
    try {
      domain = accountDomainFromConnection(ctx.connection);
    } catch (err) {
      return { state: "unknown", message: String((err as Error).message) };
    }

    let res: Response;
    try {
      res = await ctx.fetch(`https://${domain}${API_PATH}/account`, {
        headers: { accept: "application/json" },
      });
    } catch (err) {
      return { state: "down", message: `account unreachable: ${String(err)}` };
    }

    if (res.status === 404) {
      return {
        state: "down",
        message: `nothing at ${domain}${API_PATH}/account (404) — check the account address`,
      };
    }
    if (res.status >= 500) {
      return { state: "down", message: `account returned ${res.status}` };
    }
    // 200 (a public account) and 401/402/403 (the documented problem+json
    // shapes) all mean Kommo itself answered. That is the whole question.
    return { state: "ok", ttlSeconds: 120 };
  },
};

export default account;
