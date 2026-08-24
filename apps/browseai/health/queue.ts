/**
 * Is Browse AI's task-execution queue backed up?
 *
 * `GET /v2/status` answers `{tasksQueueStatus: "OK" | "UNDER_MAINTENANCE"}` —
 * a second, narrower signal than the `service` check's Statuspage roll-up.
 * The two disagree on purpose: `browseai.statuspage.io` is a human-maintained
 * incident page (someone posts to it), while this endpoint is the queue
 * reporting on itself in real time. A brief backlog can show here as
 * `UNDER_MAINTENANCE` well before anyone updates the status page, and the
 * reverse also happens — a scheduled-maintenance banner on the status page
 * with a queue that is, right now, processing normally.
 *
 * `kind: "dependency"` rather than `"service"` because this reads the same
 * endpoint every `auth:api-key` check already probes, but asks a different
 * question of it (queue health, not credential liveness) and needs a signed
 * request to reach at all — unlike the unauthenticated Statuspage read,
 * `/v2/status` answers `401 unauthorized` with no credential (verified live
 * 2026-08-24), so `credential: "signed"` and `scope: "connection"` are the
 * only honest posture for this check.
 */
import type { HealthCheckDefinition } from "@w6w/types";
import { API_BASE } from "../lib/client.ts";
import { PROBE_PATH } from "../auth/api-key.ts";

const queue: HealthCheckDefinition = {
  key: "queue",
  title: "Task queue status",
  description: "Whether Browse AI's task-execution queue is running normally or under maintenance.",
  kind: "dependency",
  scope: "connection",
  credential: "signed",
  covers: ["action:task-run", "action:bulk-run-create"],
  minIntervalSeconds: 60,

  async check(_input, ctx) {
    const res = await ctx.fetch(`${API_BASE}${PROBE_PATH}`, {
      headers: { accept: "application/json" },
    });
    if (!res.ok) {
      // A signed request already reaching auth:api-key's territory — don't
      // re-litigate credential failures here, just decline to answer.
      return { state: "unknown", message: `Browse AI returned ${res.status} for ${PROBE_PATH}` };
    }

    const body = await res.json().catch(() => null) as { tasksQueueStatus?: string } | null;
    const status = body?.tasksQueueStatus;
    if (status === "OK") return { state: "ok", ttlSeconds: 60 };
    if (status === "UNDER_MAINTENANCE") {
      return {
        state: "degraded",
        message: "Browse AI's task queue is under maintenance — new tasks may queue rather than " +
          "start promptly.",
        ttlSeconds: 60,
      };
    }
    return { state: "unknown", message: "status endpoint returned no tasksQueueStatus" };
  },
};

export default queue;
