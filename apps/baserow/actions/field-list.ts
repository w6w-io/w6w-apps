import type { ActionDefinition } from "@w6w/types";
import { BaserowClient } from "../lib/client.ts";
import { tableIdParam } from "../lib/params.ts";

/**
 * `GET /api/database/fields/table/{table_id}/` — a table's schema.
 *
 * Returns a bare array of field objects, each with `id`, `name`, `type`,
 * `primary` and the type's own configuration (select options, formula text, link
 * target, …).
 *
 * This is what you read before writing rows with field ids rather than names —
 * and what tells you which column is `primary`, since Baserow requires the
 * primary field to be set on every created row.
 */
interface Input {
  tableId: number;
}

const fieldList: ActionDefinition<Input> = {
  key: "field-list",
  type: "search",
  resource: "field",
  title: "List Fields",
  description: "List a table's fields — id, name, type and the type's own configuration.",
  params: [tableIdParam],
  output: [{ key: "[]", type: "array", label: "Fields — a bare array, not an envelope" }],

  execute(input, ctx) {
    return new BaserowClient(ctx).request(`/api/database/fields/table/${input.tableId}/`);
  },
};

export default fieldList;
