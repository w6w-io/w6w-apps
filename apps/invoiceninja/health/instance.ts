/**
 * Is THIS connection's Invoice Ninja instance healthy? — `GET /api/v1/health_check`.
 *
 * A different question from `service.ts`: that check answers for the hosted
 * invoicing.co service, but most of this app's connections point at whatever
 * install a user chose — hosted or self-hosted (see `lib/client.ts`) — so a
 * self-hosted instance is judged on its own diagnostics, same reasoning as
 * `apps/discourse`'s per-connection `site` check.
 *
 * Unlike that check (and `apps/gorgias`'s `domain` check), this endpoint is
 * NOT reachable unsigned — verified live 2026-09-05 against
 * `demo.invoiceninja.com`: both a missing and an invalid `X-API-TOKEN` come
 * back **403** `{"message":"Invalid token"}`, identical to `ping`'s own
 * rejection. So `credential` is left at this kind's default (`signed`) rather
 * than overridden to `context`.
 *
 * A valid response is a real diagnostics object — verified live against the
 * same demo instance:
 *
 *   {"system_health":true,"extensions":[...],"php_version":{...},
 *    "env_writable":false,"simple_db_check":true,"cache_enabled":false,
 *    "queue":"database","queue_data":{"failed":0,"pending":0,"last_error":""},
 *    "jobs_pending":0,"pending_migrations":true, ...}
 *
 * `system_health` is the vendor's own single verdict; `queue_data.failed` and
 * `pending_migrations` are read alongside it because a self-hosted install can
 * answer requests fine while its background jobs are silently broken —
 * exactly the failure mode `system_health` alone would miss.
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { AJAX_HEADER_VALUE, baseUrlFromConnection } from "../lib/client.ts";

interface HealthCheckResponse {
  system_health?: boolean;
  queue_data?: { failed?: number; pending?: number; last_error?: string };
  pending_migrations?: boolean;
}

const instance: HealthCheckDefinition = {
  key: "instance",
  title: "Instance health",
  description:
    "Signed probe of this connection's own Invoice Ninja instance via `GET /api/v1/health_check`" +
    " — its system health flag, failed queue jobs, and pending migrations.",
  kind: "dependency",
  scope: "connection",
  minIntervalSeconds: 300,

  async check(_input, ctx) {
    let base: string;
    try {
      base = baseUrlFromConnection(ctx.connection);
    } catch {
      return { state: "unknown", message: "connection records no instance URL" };
    }

    const res = await ctx.fetch(`${base}/api/v1/health_check`, {
      headers: { accept: "application/json", "x-requested-with": AJAX_HEADER_VALUE },
    });
    if (res.status === 401 || res.status === 403) {
      return { state: "unknown", message: "credential rejected — see the `auth:api-token` check" };
    }
    if (res.status >= 500) {
      return { state: "down", message: `instance returned ${res.status}` };
    }
    if (!res.ok) {
      return { state: "unknown", message: `instance returned ${res.status}` };
    }

    const body = await res.json().catch(() => ({})) as HealthCheckResponse;
    if (body.system_health === false) {
      return { state: "down", message: "instance reports system_health: false" };
    }
    const failed = body.queue_data?.failed ?? 0;
    if (failed > 0) {
      return {
        state: "degraded",
        message: `${failed} failed queue job(s)${
          body.queue_data?.last_error ? `: ${body.queue_data.last_error}` : ""
        }`,
        ttlSeconds: 120,
      };
    }
    if (body.pending_migrations) {
      return { state: "degraded", message: "instance has pending migrations", ttlSeconds: 120 };
    }
    return { state: "ok", ttlSeconds: 300 };
  },
};

export default instance;
