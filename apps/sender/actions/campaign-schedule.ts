import type { ActionDefinition } from "@w6w/types";
import { SenderClient } from "../lib/client.ts";

/** `POST /v2/campaigns/{id}/schedule` — schedules a campaign to send at a given time. */
interface Input {
  id: string;
  scheduleTime: string;
}

const campaignSchedule: ActionDefinition<Input> = {
  key: "campaign-schedule",
  type: "perform",
  resource: "campaign",
  title: "Schedule Campaign Send",
  description: "Specify a date and time when the campaign should be sent.",
  idempotent: true,
  params: [
    { key: "id", label: "Campaign ID", type: "string", required: true },
    {
      key: "scheduleTime",
      label: "Schedule time",
      type: "string",
      required: true,
      placeholder: "2026-05-29 08:22:41",
      hint: "Format: Y-m-d H:i:s.",
    },
  ],
  output: [
    { key: "success", type: "boolean", label: "Success" },
    { key: "message", type: "string", label: "Message" },
  ],

  execute(input, ctx) {
    return new SenderClient(ctx).data(`/campaigns/${encodeURIComponent(input.id)}/schedule`, {
      method: "POST",
      body: { schedule_time: input.scheduleTime },
    });
  },
};

export default campaignSchedule;
