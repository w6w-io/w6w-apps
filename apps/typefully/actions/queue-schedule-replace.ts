import type { ActionDefinition } from "@w6w/types";
import { asJson, TypefullyClient } from "../lib/client.ts";
import { socialSetIdParam } from "../lib/params.ts";

interface Input {
  socialSetId: number;
  rules: unknown;
}

/**
 * `PUT /v2/social-sets/{social_set_id}/queue/schedule` — full, atomic
 * replacement of the queue schedule rules. Requires ADMIN access to the
 * social set (stricter than every other write in this app, which need only
 * WRITE). `rules: []` is valid and means an empty schedule.
 *
 * Each rule is `{h: 0-23, m: 0-59, days: ["mon".."sun"]}` in the social set's
 * local time; duplicate day+time combinations are rejected.
 *
 * `idempotent: true` — a `PUT` is a full replacement by definition, so sending
 * the same rules twice leaves the same schedule either way.
 */
const queueScheduleReplace: ActionDefinition<Input> = {
  key: "queue-schedule-replace",
  type: "perform",
  resource: "queue",
  title: "Replace Queue Schedule",
  description: "Fully replace a social set's recurring posting-time rules. Requires ADMIN access.",
  idempotent: true,
  params: [
    socialSetIdParam,
    {
      key: "rules",
      label: "Rules",
      type: "json",
      required: true,
      hint: 'Array of {"h": 0-23, "m": 0-59, "days": ["mon","tue",...]}. Send [] for an empty ' +
        "schedule. Duplicate day+time combinations are rejected.",
    },
  ],
  output: [
    { key: "social_set_id", type: "number", label: "Social set ID" },
    { key: "timezone", type: "string", label: "IANA timezone name" },
    { key: "rules", type: "array", label: "Rules as stored" },
  ],

  async execute(input, ctx) {
    const rules = asJson<unknown>(input.rules, "Rules");
    return await new TypefullyClient(ctx).json(
      `/social-sets/${input.socialSetId}/queue/schedule`,
      { method: "PUT", body: { rules } },
    );
  },
};

export default queueScheduleReplace;
