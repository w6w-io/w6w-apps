import type { ActionDefinition } from "@w6w/types";
import { DatadogClient, encodeSegment } from "../lib/client.ts";

/**
 * `DELETE /api/v2/downtime/{downtime_id}` — end a downtime early.
 *
 * The other half of a deploy window, and the one that must not be skipped:
 * a downtime scheduled with no `end` runs forever.
 *
 * **Idempotent, and genuinely so.** Cancelling an already-cancelled downtime
 * changes nothing — Datadog retains a cancelled downtime for about two days, so
 * a retry addresses the same, already-inactive record. That makes it safe for
 * the runtime to retry on a dropped connection, which is exactly what you want
 * for the step that un-mutes production.
 *
 * Success is `204` with no body, so this action returns the status and the id it
 * cancelled rather than pretending Datadog said something.
 *
 * Needs the application key and the `monitors_downtime` scope.
 */
interface Input {
  downtimeId: string;
}

const downtimeCancel: ActionDefinition<Input> = {
  key: "downtime-cancel",
  type: "perform",
  resource: "downtime",
  title: "Cancel Downtime",
  description: "Cancel a scheduled downtime, un-muting its monitors.",
  idempotent: true,
  params: [
    {
      key: "downtimeId",
      label: "Downtime ID",
      type: "string",
      required: true,
      placeholder: "00000000-0000-1234-0000-000000000000",
      hint: "The UUID returned by Schedule Downtime.",
    },
  ],
  output: [
    { key: "downtimeId", type: "string", label: "Downtime cancelled" },
    { key: "status", type: "number", label: "HTTP status (204 on success)" },
  ],

  async execute(input, ctx) {
    const status = await new DatadogClient(ctx).status(
      `/api/v2/downtime/${encodeSegment(input.downtimeId)}`,
      { method: "DELETE" },
    );
    ctx.log("info", "cancelled downtime", { downtimeId: input.downtimeId });
    return { downtimeId: input.downtimeId, status };
  },
};

export default downtimeCancel;
