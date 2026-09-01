import type { ActionDefinition } from "@w6w/types";
import { compact, SellClient } from "../lib/client.ts";
import { idsParam, paginationParams, sortByParam } from "../lib/params.ts";

interface Input {
  page?: number;
  perPage?: number;
  sortBy?: string;
  ids?: string;
  ownerId?: number;
  contactId?: number;
  organizationId?: number;
  hot?: boolean;
  sourceId?: number;
  stageId?: number;
  name?: string;
}

const dealList: ActionDefinition<Input> = {
  key: "deal-list",
  type: "read",
  resource: "deal",
  title: "List Deals",
  description: "List deals, optionally filtered.",
  params: [
    ...paginationParams(),
    sortByParam(["id", "value", "name", "estimated_close_date", "updated_at", "created_at"]),
    idsParam,
    { key: "ownerId", label: "Owner user ID", type: "number" },
    { key: "contactId", label: "Primary contact ID", type: "number" },
    { key: "organizationId", label: "Organization contact ID", type: "number" },
    { key: "hot", label: "Hot only", type: "boolean" },
    { key: "sourceId", label: "Source ID", type: "number" },
    { key: "stageId", label: "Stage ID", type: "number" },
    { key: "name", label: "Name", type: "string" },
  ],
  output: [
    { key: "items", type: "array", label: "Deals" },
    { key: "count", type: "number", label: "Count on this page" },
  ],

  async execute(input, ctx) {
    const result = await new SellClient(ctx).list(
      "/deals",
      compact({
        page: input.page,
        per_page: input.perPage,
        sort_by: input.sortBy,
        ids: input.ids,
        owner_id: input.ownerId,
        contact_id: input.contactId,
        organization_id: input.organizationId,
        hot: input.hot,
        source_id: input.sourceId,
        stage_id: input.stageId,
        name: input.name,
      }),
    );
    return { items: result.items, count: result.count };
  },
};

export default dealList;
