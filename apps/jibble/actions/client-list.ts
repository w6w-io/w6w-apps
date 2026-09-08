import type { ActionDefinition } from "@w6w/types";
import { JibbleClient, WORKSPACE_HOST } from "../lib/client.ts";
import { odataListParams } from "../lib/params.ts";

/**
 * `GET /v1/Clients` — the organization's billing clients (used to group projects).
 *
 * The `Clients` entity is plan-gated: the collection's own "Add New Client" example
 * documents a live `402 feature_restricted_subscription` response on a plan that doesn't
 * include it. A 402 here means the plan, not the credential, is the problem.
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

const clientList: ActionDefinition<Input> = {
  key: "client-list",
  type: "search",
  resource: "client",
  title: "List Clients",
  description: "List the organization's clients.",
  params: odataListParams(25),
  output: [
    { key: "items", type: "array", label: "Clients" },
    { key: "count", type: "number", label: "Total matching clients (only when Count is on)" },
  ],

  async execute(input, ctx) {
    return await new JibbleClient(ctx).list(WORKSPACE_HOST, "/v1/Clients", {
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

export default clientList;
