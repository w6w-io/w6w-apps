import type { ActionDefinition } from "@w6w/types";
import { buildListQuery, HarvestClient, type HarvestPage } from "../lib/client.ts";
import { type BaseListInput, baseListQuery } from "../lib/list.ts";
import {
  createdAtParams,
  fieldsParam,
  idsParam,
  listOutput,
  paginationParams,
  updatedAtParams,
} from "../lib/params.ts";

/**
 * `GET /v3/rejection_reasons` — the reasons a rejection can be recorded against.
 *
 * `reject-application` requires a `rejection_reason_id` and will not invent one,
 * so any workflow that rejects has to resolve a reason first. Resolve it once
 * and store the id: reason names are editable by customers, ids are not.
 *
 * `include_defaults` adds Greenhouse's built-in reasons to the organisation's
 * own. Off by default, which is why a lookup that only ever sees custom reasons
 * can miss the one the customer actually uses.
 */
interface Input extends BaseListInput {
  includeDefaults?: boolean;
}

const listRejectionReasons: ActionDefinition<Input, HarvestPage<unknown>> = {
  key: "list-rejection-reasons",
  type: "search",
  resource: "organization",
  title: "List Rejection Reasons",
  description: "List rejection reasons — the lookup for the id that Reject Application requires.",
  params: [
    {
      key: "includeDefaults",
      label: "Include Greenhouse defaults",
      type: "boolean",
      hint: "Adds Greenhouse's built-in reasons to the organisation's own custom ones.",
    },
    ...createdAtParams(),
    ...updatedAtParams(),
    idsParam,
    fieldsParam,
    ...paginationParams(),
  ],
  output: listOutput("Rejection reasons"),

  execute(input, ctx) {
    return new HarvestClient(ctx).list("/rejection_reasons", {
      query: buildListQuery(input.cursor, {
        ...baseListQuery(input),
        include_defaults: input.includeDefaults,
      }),
    });
  },
};

export default listRejectionReasons;
