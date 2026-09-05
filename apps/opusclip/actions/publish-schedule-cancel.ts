import type { ActionDefinition } from "@w6w/types";
import { OpusClipClient } from "../lib/client.ts";

/**
 * `DELETE /api/publish-schedules/{scheduleId}` — cancel a scheduled post
 * before its publish time.
 */
interface Input {
  scheduleId: string;
}

const publishScheduleCancel: ActionDefinition<Input> = {
  key: "publish-schedule-cancel",
  type: "perform",
  resource: "publish-schedule",
  title: "Cancel Scheduled Post",
  description: "Cancel a scheduled publish task before its publish time.",
  idempotent: true,
  params: [
    { key: "scheduleId", label: "Schedule ID", type: "string", required: true },
  ],
  output: [{ key: "canceled", type: "boolean", label: "Canceled" }],

  async execute(input, ctx) {
    await new OpusClipClient(ctx).data(
      `/api/publish-schedules/${encodeURIComponent(input.scheduleId)}`,
      { method: "DELETE" },
    );
    return { canceled: true };
  },
};

export default publishScheduleCancel;
