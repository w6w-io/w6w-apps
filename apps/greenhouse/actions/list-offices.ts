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
 * `GET /v3/offices` — the organisation's locations.
 *
 * Same shape as departments, including the `parent_id` nesting and the
 * `external_id` hook into an HRIS. A job carries `office_ids` (plural) and a
 * single `department_id`, which is the asymmetry to remember when joining these
 * two lists onto jobs.
 */
interface Input extends BaseListInput {
  parentId?: number;
  externalId?: string;
}

const listOffices: ActionDefinition<Input, HarvestPage<unknown>> = {
  key: "list-offices",
  type: "search",
  resource: "organization",
  title: "List Offices",
  description: "List offices, optionally scoped to one parent or matched by external id.",
  params: [
    {
      key: "parentId",
      label: "Parent office id",
      type: "number",
      validation: { integer: true, min: 1 },
      hint: "Direct children of this office.",
    },
    {
      key: "externalId",
      label: "External id",
      type: "string",
      hint: "The office's id in your HRIS, when one was recorded.",
    },
    ...createdAtParams(),
    ...updatedAtParams(),
    idsParam,
    fieldsParam,
    ...paginationParams(),
  ],
  output: listOutput("Offices"),

  execute(input, ctx) {
    return new HarvestClient(ctx).list("/offices", {
      query: buildListQuery(input.cursor, {
        ...baseListQuery(input),
        parent_id: input.parentId,
        external_id: input.externalId,
      }),
    });
  },
};

export default listOffices;
