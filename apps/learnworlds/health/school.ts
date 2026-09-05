/**
 * Is THIS connection's school domain reachable?
 *
 * `service` answers "is LearnWorlds-the-vendor up"; it says nothing about a
 * given school, which may sit on a suspended plan, a renamed subdomain, or a
 * misconfigured custom domain while LearnWorlds itself is fully healthy.
 *
 *   - `kind: "dependency"` / `scope: "connection"` — every Connection points
 *     at a different school, on a different domain.
 *   - `credential: "context"` — the check needs the Connection to know WHICH
 *     domain to call, and needs no credential to interpret the answer.
 *     `sign` must not run.
 *   - No `network.allow` here: the app's own manifest is already `["*"]`
 *     (a school domain is user-supplied), and a `context` check is unsigned
 *     regardless.
 *
 * The probe is deliberately unauthenticated. Verified live against a real
 * production school (`academy.learnworlds.com`, 2026-09-05): an unsigned
 * `GET /admin/api/v2/courses` answers `400 {"errors":[{"code":400,
 * "context":"client_id","message":"Missing client_id or client cannot be
 * found."}],"success":false}` — proof the domain resolves, TLS terminates,
 * and the school's own API gateway is answering. That 400 is therefore a
 * **pass** here, the same way `freshdesk`'s `domain` check treats an
 * unsigned 401 as proof of life — whether the credential is any good is the
 * derived `auth:*` check's job. A deleted school answers a **redirect** to a
 * "this school was deleted" marketing page instead of JSON (verified against
 * `api.learnworlds.com`, itself a since-deleted school subdomain used in
 * LearnWorlds' own v1 docs examples) — that is treated as `down`, same as a
 * 404 or 5xx.
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { normalizeSchoolDomain } from "../lib/client.ts";

const school: HealthCheckDefinition = {
  key: "school",
  title: "School domain reachable",
  description:
    "Unauthenticated request to this connection's school domain. A 400 'missing client_id' " +
    "response passes — it proves the school is serving; credential validity is the `auth:*` " +
    "check's job.",
  kind: "dependency",
  scope: "connection",
  credential: "context",
  covers: ["*"],
  minIntervalSeconds: 120,

  async check(_input, ctx) {
    // `display` is redacted Connection metadata — never the credential.
    const display = (ctx.connection?.display ?? {}) as { schoolDomain?: string };
    if (!display.schoolDomain) {
      return { state: "unknown", message: "connection records no school domain" };
    }

    let origin: string;
    try {
      origin = normalizeSchoolDomain(display.schoolDomain);
    } catch {
      return { state: "unknown", message: "connection records an unparseable school domain" };
    }

    const res = await ctx.fetch(`${origin}/admin/api/v2/courses`, { redirect: "manual" });
    if (res.status >= 300 && res.status < 400) {
      return {
        state: "down",
        message: "school domain redirected instead of answering the API — it may have been " +
          "deleted or renamed",
      };
    }
    if (res.status === 404) {
      return { state: "down", message: "school domain not found (404)" };
    }
    if (res.status >= 500) {
      return { state: "down", message: `school domain returned ${res.status}` };
    }
    // Any other status — 400 (missing client_id), 401, 403, or 200 — means
    // the school's own API gateway is answering. That is the whole question.
    return { state: "ok", ttlSeconds: 120 };
  },
};

export default school;
