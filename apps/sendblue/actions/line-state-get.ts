import type { ActionDefinition } from "@w6w/types";
import { SendblueClient } from "../lib/client.ts";

type Input = Record<string, never>;

/**
 * `GET /api/v2/lines/state` — a per-line ONLINE/OFFLINE/DEGRADED/UNKNOWN
 * snapshot for every Sendblue number assigned to this account. The same
 * endpoint backs the richer `lines` health check (`health/lines.ts`), which
 * maps the raw statuses into a `HealthReport`; this action is not tagged with
 * `healthCheck` itself because its own output is the raw Sendblue response,
 * not a `HealthReport` shape.
 */
const lineStateGet: ActionDefinition<Input> = {
  key: "line-state-get",
  type: "read",
  resource: "line",
  title: "Get Line State",
  description: "Snapshot of this account's line assignment and health.",
  params: [],
  output: [
    { key: "data", type: "array", label: "Per-line state" },
    { key: "snapshot_at", type: "string", label: "Snapshot timestamp" },
  ],

  execute(_input, ctx) {
    const client = new SendblueClient(ctx);
    return client.get("/api/v2/lines/state");
  },
};

export default lineStateGet;
