import type { ActionDefinition } from "@w6w/types";
import { PAGE_PARAMS, type PageInput, pageQuery, WealthboxClient } from "../lib/client.ts";

interface Input extends PageInput {
  resourceId?: number;
  resourceType?: string;
  order?: string;
  includeClosed?: boolean;
  updatedSince?: string;
  updatedBefore?: string;
}

/** `GET /v1/opportunities` — list/filter Opportunities accessible to the user. */
const listOpportunities: ActionDefinition<Input> = {
  key: "list-opportunities",
  type: "search",
  resource: "opportunity",
  title: "List Opportunities",
  description: "List/filter Opportunities. Won and lost opportunities are excluded by default.",
  params: [
    { key: "resourceId", label: "Linked resource ID", type: "number" },
    { key: "resourceType", label: "Linked resource type", type: "string" },
    {
      key: "order",
      label: "Order",
      type: "select",
      options: [
        { value: "asc", label: "Ascending" },
        { value: "desc", label: "Descending" },
        { value: "recent", label: "Recent" },
        { value: "created", label: "Created" },
      ],
    },
    { key: "includeClosed", label: "Include won/lost", type: "boolean" },
    { key: "updatedSince", label: "Updated since", type: "string" },
    { key: "updatedBefore", label: "Updated before", type: "string" },
    ...PAGE_PARAMS,
  ],
  output: [{ key: "opportunities", type: "array", label: "Opportunities" }],

  execute(input, ctx) {
    return new WealthboxClient(ctx).request("/opportunities", {
      query: {
        resource_id: input.resourceId,
        resource_type: input.resourceType,
        order: input.order,
        include_closed: input.includeClosed,
        updated_since: input.updatedSince,
        updated_before: input.updatedBefore,
        ...pageQuery(input),
      },
    });
  },
};

export default listOpportunities;
