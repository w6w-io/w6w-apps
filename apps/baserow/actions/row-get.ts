import type { ActionDefinition } from "@w6w/types";
import { BaserowClient, userFieldNamesFlag } from "../lib/client.ts";
import { tableIdParam, userFieldNamesParam, viewParam } from "../lib/params.ts";

/** `GET /api/database/rows/table/{table_id}/{row_id}/` — one row. */
interface Input {
  tableId: number;
  rowId: number;
  userFieldNames?: boolean;
  includeMetadata?: boolean;
  view?: number;
}

const rowGet: ActionDefinition<Input> = {
  key: "row-get",
  type: "read",
  resource: "row",
  title: "Get Row",
  description: "Fetch a single row by its id.",
  params: [
    tableIdParam,
    {
      key: "rowId",
      label: "Row ID",
      type: "number",
      required: true,
      validation: { integer: true, min: 1 },
    },
    userFieldNamesParam,
    {
      key: "includeMetadata",
      label: "Include metadata",
      type: "boolean",
      hint: "Adds a `metadata` object with extra row-specific data such as comment counts.",
    },
    viewParam,
  ],
  output: [{ key: "id", type: "number", label: "Row id" }],

  execute(input, ctx) {
    return new BaserowClient(ctx).request(
      `/api/database/rows/table/${input.tableId}/${input.rowId}/`,
      {
        query: {
          user_field_names: userFieldNamesFlag(input.userFieldNames),
          include: input.includeMetadata ? "metadata" : undefined,
          view: input.view,
        },
      },
    );
  },
};

export default rowGet;
