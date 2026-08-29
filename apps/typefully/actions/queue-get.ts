import type { ActionDefinition } from "@w6w/types";
import { TypefullyClient } from "../lib/client.ts";
import { socialSetIdParam } from "../lib/params.ts";

interface Input {
  socialSetId: number;
  startDate: string;
  endDate: string;
}

/**
 * `GET /v2/social-sets/{social_set_id}/queue` — queue slots plus the
 * scheduled/planned drafts occupying them, over `[startDate, endDate]`
 * inclusive, both `YYYY-MM-DD` in the social set's own timezone. The vendor
 * rejects ranges over 62 days.
 *
 * Check each occupying draft's `status`: `scheduled` will auto-publish;
 * `planned` is dated but inert and will not, even past its date.
 */
const queueGet: ActionDefinition<Input> = {
  key: "queue-get",
  type: "read",
  resource: "queue",
  title: "Get Queue",
  description: "Fetch queue slots and their occupying drafts over a date range (max 62 days).",
  params: [
    socialSetIdParam,
    {
      key: "startDate",
      label: "Start Date",
      type: "date",
      required: true,
      hint: "YYYY-MM-DD, in the social set's own timezone.",
    },
    {
      key: "endDate",
      label: "End Date",
      type: "date",
      required: true,
      hint: "YYYY-MM-DD, inclusive. The range cannot exceed 62 days.",
    },
  ],
  output: [
    { key: "social_set_id", type: "number", label: "Social set ID" },
    { key: "start_date", type: "string", label: "Start date used" },
    { key: "end_date", type: "string", label: "End date used" },
    { key: "days", type: "array", label: "Days in range, each with its queue items" },
  ],

  async execute(input, ctx) {
    return await new TypefullyClient(ctx).json(`/social-sets/${input.socialSetId}/queue`, {
      query: { start_date: input.startDate, end_date: input.endDate },
    });
  },
};

export default queueGet;
