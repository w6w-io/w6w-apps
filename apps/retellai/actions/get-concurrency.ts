import type { ActionDefinition } from "@w6w/types";
import { RetellClient } from "../lib/client.ts";

/**
 * `GET /get-concurrency` — the org's concurrent-call capacity.
 *
 * This is the ceiling that actually stops a workflow, not a request-rate
 * limit: Retell meters concurrent ONGOING calls per org, shared across
 * inbound, outbound and batch calls, rather than requests per second. A
 * `create-batch-call` that ignores this can queue far more tasks than the
 * org can run at once; `health/quota.ts` reports the same figures on the
 * health surface so a near-full org shows up before a batch run hits it.
 *
 * `concurrency_burst_limit` matters when `concurrency_burst_enabled` is true:
 * the org can exceed `concurrency_limit` up to this higher figure at a
 * surcharge, so `concurrency_limit` alone understates real headroom for an
 * org that opted into burst.
 */
interface Output {
  current_concurrency: number;
  concurrency_limit: number;
  base_concurrency: number;
  purchased_concurrency: number;
  concurrency_purchase_limit?: number;
  remaining_purchase_limit?: number;
  reserved_inbound_concurrency?: number;
  concurrency_burst_enabled?: boolean;
  concurrency_burst_limit?: number;
}

const getConcurrency: ActionDefinition<Record<string, never>, Output> = {
  key: "get-concurrency",
  type: "read",
  resource: "org",
  title: "Get Concurrency",
  description: "Read the org's current concurrent-call usage and limit.",
  params: [],
  output: [
    { key: "current_concurrency", type: "number", label: "Current concurrent calls" },
    { key: "concurrency_limit", type: "number", label: "Concurrency limit" },
    { key: "base_concurrency", type: "number", label: "Free concurrency" },
    { key: "purchased_concurrency", type: "number", label: "Purchased concurrency" },
    { key: "reserved_inbound_concurrency", type: "number", label: "Reserved for inbound" },
    { key: "concurrency_burst_enabled", type: "boolean", label: "Burst mode enabled" },
    { key: "concurrency_burst_limit", type: "number", label: "Burst concurrency limit" },
  ],

  execute(_input, ctx) {
    return new RetellClient(ctx).request<Output>("/get-concurrency");
  },
};

export default getConcurrency;
