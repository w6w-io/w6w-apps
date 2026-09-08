import type { ActionDefinition } from "@w6w/types";
import { JibbleClient, WORKSPACE_HOST } from "../lib/client.ts";
import { odataListParams } from "../lib/params.ts";

/**
 * `GET /v1/People` — the organization's members (and kiosk/API service "people").
 *
 * The default `$top` here (25) is this app's own choice, not Jibble's — the collection's own
 * example asks for `$top=5`, and the vendor doesn't state a hard default of its own.
 */
interface Input {
  filter?: string;
  select?: string;
  expand?: string;
  orderBy?: string;
  top?: number;
  skip?: number;
  count?: boolean;
}

const memberList: ActionDefinition<Input> = {
  key: "member-list",
  type: "search",
  resource: "member",
  title: "List Members",
  description: "List people in the organization. Supports Jibble's OData query parameters.",
  params: odataListParams(25),
  output: [
    { key: "items", type: "array", label: "Members" },
    { key: "count", type: "number", label: "Total matching members (only when Count is on)" },
  ],

  async execute(input, ctx) {
    return await new JibbleClient(ctx).list(WORKSPACE_HOST, "/v1/People", {
      filter: input.filter,
      select: input.select,
      expand: input.expand,
      orderBy: input.orderBy,
      top: input.top,
      skip: input.skip,
      count: input.count,
    });
  },
};

export default memberList;
