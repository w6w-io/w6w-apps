import type { ActionDefinition } from "@w6w/types";
import { AircallClient } from "../lib/client.ts";
import {
  listOutput,
  listResult,
  orderOptions,
  type PaginationInput,
  paginationParams,
  paginationQuery,
} from "../lib/params.ts";

interface Input extends PaginationInput {
  order?: string;
}

/**
 * `GET /v1/teams` — the company's Teams and their members.
 *
 * Teams exist for one purpose: "Teams are only used in call distributions of
 * Numbers." They are not a permission boundary.
 *
 * This endpoint's embedded User rows carry **more** than Retrieve Team's do —
 * Aircall notes that `availability_status` and `default_number_id` "can be
 * retrieved using List all Teams endpoint", and the Retrieve Team sample omits
 * them. The `available` boolean is absent from both.
 *
 * Unlike the other list endpoints this one takes `order` but no `from`/`to`
 * window.
 */
const teamList: ActionDefinition<Input> = {
  key: "team-list",
  type: "read",
  resource: "team",
  title: "List Teams",
  description:
    "List Teams with their members. This endpoint's user rows carry availability_status and " +
    "default_number_id, which Retrieve Team's do not.",
  params: [
    { key: "order", label: "Order", type: "select", options: orderOptions },
    ...paginationParams(),
  ],
  output: listOutput,

  async execute(input, ctx) {
    const client = new AircallClient(ctx);
    const { meta, items } = await client.list<Record<string, unknown>>("/teams", "teams", {
      query: { ...paginationQuery(input), order: input.order },
    });
    return listResult(meta, items);
  },
};

export default teamList;
