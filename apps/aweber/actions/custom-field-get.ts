import type { ActionDefinition } from "@w6w/types";
import { AweberClient, encodeId } from "../lib/client.ts";
import { accountIdParam, customFieldIdParam, listIdParam } from "../lib/params.ts";

/** `GET /accounts/{accountId}/lists/{listId}/custom_fields/{customFieldId}`. */
interface Input {
  accountId: string;
  listId: string;
  customFieldId: string;
}

const customFieldGet: ActionDefinition<Input> = {
  key: "custom-field-get",
  type: "read",
  resource: "custom-field",
  title: "Get Custom Field",
  description: "Get one custom field definition by id.",
  params: [accountIdParam, listIdParam, customFieldIdParam],
  output: [
    { key: "id", type: "string", label: "Custom Field ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "is_subscriber_updateable", type: "boolean", label: "Subscriber can update it" },
  ],

  execute(input, ctx) {
    const { accountId, listId, customFieldId } = input;
    return new AweberClient(ctx).json<Record<string, unknown>>(
      `/accounts/${encodeId(accountId)}/lists/${encodeId(listId)}/custom_fields/${
        encodeId(customFieldId)
      }`,
    );
  },
};

export default customFieldGet;
