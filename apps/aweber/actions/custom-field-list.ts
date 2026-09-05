import type { ActionDefinition } from "@w6w/types";
import { AweberClient, encodeId } from "../lib/client.ts";
import { accountIdParam, listIdParam, paginationParams, paginationQuery } from "../lib/params.ts";

/** `GET /accounts/{accountId}/lists/{listId}/custom_fields` — a list's custom field definitions. */
interface Input {
  accountId: string;
  listId: string;
  start?: number;
  size?: number;
}

const customFieldList: ActionDefinition<Input> = {
  key: "custom-field-list",
  type: "search",
  resource: "custom-field",
  title: "List Custom Fields",
  description: "List the custom field definitions on a list.",
  params: [accountIdParam, listIdParam, ...paginationParams()],
  output: [{ key: "entries", type: "array", label: "Custom fields" }],

  execute(input, ctx) {
    return new AweberClient(ctx).list<Record<string, unknown>>(
      `/accounts/${encodeId(input.accountId)}/lists/${encodeId(input.listId)}/custom_fields`,
      paginationQuery(input),
    );
  },
};

export default customFieldList;
