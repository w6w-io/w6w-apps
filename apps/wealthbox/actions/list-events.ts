import type { ActionDefinition } from "@w6w/types";
import { PAGE_PARAMS, type PageInput, pageQuery, WealthboxClient } from "../lib/client.ts";

interface Input extends PageInput {
  resourceId?: number;
  resourceType?: string;
  startDateMin?: string;
  startDateMax?: string;
  order?: string;
  updatedSince?: string;
  updatedBefore?: string;
}

/** `GET /v1/events` — list/filter calendar Events accessible to the user. */
const listEvents: ActionDefinition<Input> = {
  key: "list-events",
  type: "search",
  resource: "event",
  title: "List Events",
  description: "List/filter calendar Events accessible to the authenticated user.",
  params: [
    { key: "resourceId", label: "Linked resource ID", type: "number" },
    { key: "resourceType", label: "Linked resource type", type: "string" },
    { key: "startDateMin", label: "Start date (min)", type: "string" },
    { key: "startDateMax", label: "Start date (max)", type: "string" },
    {
      key: "order",
      label: "Order",
      type: "select",
      options: [
        { value: "asc", label: "Ascending (by start)" },
        { value: "desc", label: "Descending (by start)" },
        { value: "recent", label: "Recent" },
        { value: "created", label: "Created" },
      ],
    },
    { key: "updatedSince", label: "Updated since", type: "string" },
    { key: "updatedBefore", label: "Updated before", type: "string" },
    ...PAGE_PARAMS,
  ],
  output: [{ key: "events", type: "array", label: "Events" }],

  execute(input, ctx) {
    return new WealthboxClient(ctx).request("/events", {
      query: {
        resource_id: input.resourceId,
        resource_type: input.resourceType,
        start_date_min: input.startDateMin,
        start_date_max: input.startDateMax,
        order: input.order,
        updated_since: input.updatedSince,
        updated_before: input.updatedBefore,
        ...pageQuery(input),
      },
    });
  },
};

export default listEvents;
