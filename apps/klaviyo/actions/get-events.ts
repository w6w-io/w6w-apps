import type { ActionDefinition } from "@w6w/types";
import { KlaviyoClient, type KlaviyoEnvelope } from "../lib/client.ts";

interface Input {
  filter?: string;
  sort?: string;
  pageCursor?: string;
  include?: string;
  fieldsEvent?: string;
}

const getEvents: ActionDefinition<Input, KlaviyoEnvelope<unknown[]>> = {
  key: "get-events",
  type: "read",
  resource: "event",
  title: "Get Events",
  description: "List events with optional JSON:API filtering by metric, profile, or datetime.",
  params: [
    {
      key: "filter",
      label: "Filter",
      type: "string",
      hint:
        'e.g. `equals(metric_id,"MYm123")` or `greater-or-equal(datetime,2024-01-01T00:00:00Z)`.',
    },
    { key: "sort", label: "Sort", type: "string", default: "-datetime" },
    { key: "pageCursor", label: "Page cursor", type: "string" },
    { key: "include", label: "Include", type: "string", hint: "e.g. `profile,metric`." },
    { key: "fieldsEvent", label: "Event fields (comma-separated)", type: "string" },
  ],

  async execute(input, ctx) {
    const client = new KlaviyoClient(ctx);
    return client.request<KlaviyoEnvelope<unknown[]>>(`/events/`, {
      query: {
        filter: input.filter,
        sort: input.sort ?? "-datetime",
        "page[cursor]": input.pageCursor,
        include: input.include,
        "fields[event]": input.fieldsEvent,
      },
    });
  },
};

export default getEvents;
