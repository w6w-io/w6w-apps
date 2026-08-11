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
 * `GET /v3/departments` — the organisation's department tree.
 *
 * Departments nest: `parent_id` is set on a child and null at the root, so the
 * flat list is a tree that has to be reassembled. `external_id` is the id of the
 * same department in the customer's HRIS, which is what makes this list useful
 * for reconciliation rather than just for display.
 */
interface Input extends BaseListInput {
  parentId?: number;
  externalId?: string;
}

const listDepartments: ActionDefinition<Input, HarvestPage<unknown>> = {
  key: "list-departments",
  type: "search",
  resource: "organization",
  title: "List Departments",
  description: "List departments, optionally scoped to one parent or matched by external id.",
  params: [
    {
      key: "parentId",
      label: "Parent department id",
      type: "number",
      validation: { integer: true, min: 1 },
      hint: "Direct children of this department. Departments nest, so a full tree needs the " +
        "unfiltered list.",
    },
    {
      key: "externalId",
      label: "External id",
      type: "string",
      hint: "The department's id in your HRIS, when one was recorded.",
    },
    ...createdAtParams(),
    ...updatedAtParams(),
    idsParam,
    fieldsParam,
    ...paginationParams(),
  ],
  output: listOutput("Departments"),

  execute(input, ctx) {
    return new HarvestClient(ctx).list("/departments", {
      query: buildListQuery(input.cursor, {
        ...baseListQuery(input),
        parent_id: input.parentId,
        external_id: input.externalId,
      }),
    });
  },
};

export default listDepartments;
