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
 * `GET /v3/sources` — where candidates come from.
 *
 * The organisation's source dictionary (job boards, referrals, agencies, events)
 * with a `type` grouping each one. This is the lookup for the `source_id` that
 * `create-candidate` and `create-application` accept: attribution has to be an
 * id from this list, not a free-text label, so a workflow that imports
 * candidates from somewhere should resolve its source once and reuse the id.
 */
type Input = BaseListInput;

const listSources: ActionDefinition<Input, HarvestPage<unknown>> = {
  key: "list-sources",
  type: "search",
  resource: "organization",
  title: "List Sources",
  description: "List the organisation's candidate sources — the lookup for source_id.",
  params: [
    ...createdAtParams(),
    ...updatedAtParams(),
    idsParam,
    fieldsParam,
    ...paginationParams(),
  ],
  output: listOutput("Sources"),

  execute(input, ctx) {
    return new HarvestClient(ctx).list("/sources", {
      query: buildListQuery(input.cursor, baseListQuery(input)),
    });
  },
};

export default listSources;
