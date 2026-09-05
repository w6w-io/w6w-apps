import type { ActionDefinition } from "@w6w/types";
import { AweberClient, compact, encodeId } from "../lib/client.ts";
import { accountIdParam, customFieldIdParam, listIdParam } from "../lib/params.ts";

/**
 * `PATCH /accounts/{accountId}/lists/{listId}/custom_fields/{customFieldId}`.
 *
 * Succeeds with the non-standard HTTP status **`209`**, not `200`, and
 * returns the updated field as the body. `fetch`'s `res.ok` is `true` for any
 * 2xx status so this needs no special handling here, but it is why this
 * action does not assert a particular status code anywhere — see
 * `lib/client.ts` for the full finding.
 */
interface Input {
  accountId: string;
  listId: string;
  customFieldId: string;
  name?: string;
  isSubscriberUpdateable?: boolean;
}

const customFieldUpdate: ActionDefinition<Input> = {
  key: "custom-field-update",
  type: "perform",
  resource: "custom-field",
  title: "Update Custom Field",
  description: "Rename a custom field, or change whether a subscriber may update it.",
  idempotent: true,
  params: [
    accountIdParam,
    listIdParam,
    customFieldIdParam,
    { key: "name", label: "New name", type: "string" },
    {
      key: "isSubscriberUpdateable",
      label: "Subscriber can update it",
      type: "boolean",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Custom Field ID" },
    { key: "name", type: "string", label: "Name" },
  ],

  execute(input, ctx) {
    const { accountId, listId, customFieldId } = input;
    return new AweberClient(ctx).json<Record<string, unknown>>(
      `/accounts/${encodeId(accountId)}/lists/${encodeId(listId)}/custom_fields/${
        encodeId(customFieldId)
      }`,
      {
        method: "PATCH",
        body: compact({
          name: input.name,
          is_subscriber_updateable: input.isSubscriberUpdateable,
        }),
      },
    );
  },
};

export default customFieldUpdate;
