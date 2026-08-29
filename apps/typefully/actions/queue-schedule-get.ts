import type { ActionDefinition } from "@w6w/types";
import { TypefullyClient } from "../lib/client.ts";
import { socialSetIdParam } from "../lib/params.ts";

interface Input {
  socialSetId: number;
}

/**
 * `GET /v2/social-sets/{social_set_id}/queue/schedule` — the recurring
 * posting-time rules (local time + days of week) that generate this social
 * set's queue slots. If no schedule row exists yet, the vendor creates one
 * with defaults on this read.
 */
const queueScheduleGet: ActionDefinition<Input> = {
  key: "queue-schedule-get",
  type: "read",
  resource: "queue",
  title: "Get Queue Schedule",
  description: "Fetch the recurring posting-time rules that generate this social set's queue.",
  params: [socialSetIdParam],
  output: [
    { key: "social_set_id", type: "number", label: "Social set ID" },
    { key: "timezone", type: "string", label: "IANA timezone name" },
    { key: "rules", type: "array", label: "Schedule rules — {h, m, days[]} in local time" },
  ],

  async execute(input, ctx) {
    return await new TypefullyClient(ctx).json(`/social-sets/${input.socialSetId}/queue/schedule`);
  },
};

export default queueScheduleGet;
