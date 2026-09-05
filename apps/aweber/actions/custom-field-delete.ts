import type { ActionDefinition } from "@w6w/types";
import { AweberClient, encodeId } from "../lib/client.ts";
import { accountIdParam, customFieldIdParam, listIdParam } from "../lib/params.ts";

/** `DELETE /accounts/{accountId}/lists/{listId}/custom_fields/{customFieldId}`. Answers `200`. */
interface Input {
  accountId: string;
  listId: string;
  customFieldId: string;
}

const customFieldDelete: ActionDefinition<Input> = {
  key: "custom-field-delete",
  type: "perform",
  resource: "custom-field",
  title: "Delete Custom Field",
  description: "Delete a custom field definition from a list.",
  idempotent: true,
  params: [accountIdParam, listIdParam, customFieldIdParam],
  output: [{ key: "status", type: "number", label: "HTTP status" }],

  async execute(input, ctx) {
    const { accountId, listId, customFieldId } = input;
    const res = await new AweberClient(ctx).raw(
      `/accounts/${encodeId(accountId)}/lists/${encodeId(listId)}/custom_fields/${
        encodeId(customFieldId)
      }`,
      { method: "DELETE" },
    );
    return { status: res.status };
  },
};

export default customFieldDelete;
