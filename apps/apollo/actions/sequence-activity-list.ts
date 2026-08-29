import type { ActionDefinition } from "@w6w/types";
import { ApolloClient, compact } from "../lib/client.ts";

/** `POST /emailer_campaigns/activity_feed` — one contact's sequence activity events. */
interface Input {
  contact_id: string;
  sequence_id?: string;
  per_page?: number;
}

const sequenceActivityList: ActionDefinition<Input> = {
  key: "sequence-activity-list",
  type: "read",
  resource: "sequence",
  title: "Get Contact Sequence Activity",
  description: "List a contact's sequence activity events (opens, clicks, replies, steps sent).",
  params: [
    { key: "contact_id", label: "Contact", type: "string", required: true },
    {
      key: "sequence_id",
      label: "Sequence",
      type: "string",
      hint: "Limit to events from one sequence. Leave empty for events across all sequences.",
    },
    {
      key: "per_page",
      label: "Max events",
      type: "number",
      default: 50,
      validation: { integer: true, min: 1, max: 50 },
    },
  ],
  output: [{ key: "events", type: "array", label: "Sequence activity events, newest first" }],

  async execute(input, ctx) {
    const body = await new ApolloClient(ctx).post<{ events?: unknown[] }>(
      "/emailer_campaigns/activity_feed",
      {
        body: compact({
          contact_id: input.contact_id,
          sequence_id: input.sequence_id,
          per_page: input.per_page,
        }),
      },
    );
    return { events: body.events ?? [] };
  },
};

export default sequenceActivityList;
