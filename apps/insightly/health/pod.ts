/**
 * Is this connection's Insightly pod reachable?
 *
 * Insightly is multi-tenant across regional hosts (`api.na1.insightly.com`,
 * `api.eu1.insightly.com`, ...), and its Statuspage does not break status
 * down per pod — so a pod-specific outage, or simply a mistyped pod, would
 * not show up in `service`. This check answers that separately.
 *
 * The failure mode is unusual and worth stating: a WRONG pod is not a 404
 * from Insightly's servers, it's a DNS resolution failure — verified live,
 * `api.<made-up-pod>.insightly.com` never reaches any host at all. So unlike
 * this pack's other per-tenant-host checks (Freshdesk's `domain`, Gorgias's
 * `domain`), the "wrong subdomain" case here surfaces as `ctx.fetch`
 * REJECTING rather than resolving to a 404 response.
 *
 * Annotation:
 *
 *   - `kind: "dependency"` — Insightly's Statuspage already covers "is the
 *     platform up" app-wide; this covers "is THIS pod up", a narrower and
 *     different question.
 *   - `scope: "connection"` — every Connection can be on a different pod.
 *   - `credential: "context"` — needs the Connection to know which host to
 *     call, not the credential to interpret the answer. `sign` must not run.
 *   - No `network.allow`: `*.insightly.com` is already on the app's
 *     allowlist, and a `context` check is unsigned regardless.
 *   - `severity` defaults to `degraded` for this kind.
 *
 * The probe is deliberately unauthenticated, so a 401 is a PASS: it proves
 * the pod resolves, TLS terminates, and the API is answering — exactly the
 * documented body `{"Message":"Authorization has been denied for this
 * request."}`, verified live. Whether the credential itself is any good is
 * the derived `auth:*` check's job.
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { baseUrl } from "../lib/client.ts";

const pod: HealthCheckDefinition = {
  key: "pod",
  title: "Pod reachable",
  description:
    "Unauthenticated request to this connection's Insightly pod. A 401 passes — it proves the " +
    "pod is serving; credential validity is the auth:api-key check's job. A DNS failure means " +
    "the pod segment is wrong.",
  kind: "dependency",
  scope: "connection",
  credential: "context",
  covers: ["*"],
  minIntervalSeconds: 120,

  async check(_input, ctx) {
    const display = (ctx.connection?.display ?? {}) as { pod?: string };
    if (!display.pod) return { state: "unknown", message: "connection records no pod" };

    try {
      const res = await ctx.fetch(`${baseUrl(display.pod)}/Users/Me`);
      if (res.status >= 500) return { state: "down", message: `pod returned ${res.status}` };
      // 401 (and 200, if somehow unauthenticated reads were ever allowed) both
      // mean the pod is serving. That is the whole question.
      return { state: "ok", ttlSeconds: 120 };
    } catch (err) {
      return {
        state: "down",
        message: `pod "${display.pod}" is not reachable (${
          err instanceof Error ? err.message : String(err)
        }) — check the pod segment from your Insightly API URL`,
      };
    }
  },
};

export default pod;
