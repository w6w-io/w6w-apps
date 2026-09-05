import type { ActionDefinition } from "@w6w/types";
import { AweberClient, encodeId, locationId } from "../lib/client.ts";
import { accountIdParam, listIdParam } from "../lib/params.ts";

/**
 * `POST /accounts/{accountId}/lists/{listId}/custom_fields` — add a custom
 * field definition to a list.
 *
 * The request body is not just `{"name": ...}` — AWeber's schema requires a
 * second field, `ws.op: "create"`, with no other enum value accepted. And
 * the response is worth knowing in advance: success is `201` with **no
 * body at all**, only a `Location` header naming the new field's URL. This
 * action reads the id back out of that header (see `lib/client.ts`
 * {@link locationId}) rather than returning nothing.
 *
 * Not marked idempotent: nothing in the API documents a way to dedupe by
 * name, so calling this twice with the same name creates two fields (or, per
 * the field-list constraints, may 400 on the duplicate — either way, retrying
 * safely is not guaranteed).
 */
interface Input {
  accountId: string;
  listId: string;
  name: string;
}

const customFieldCreate: ActionDefinition<Input> = {
  key: "custom-field-create",
  type: "perform",
  resource: "custom-field",
  title: "Create Custom Field",
  description: "Add a custom field definition to a list.",
  idempotent: false,
  params: [
    accountIdParam,
    listIdParam,
    { key: "name", label: "Name", type: "string", required: true },
  ],
  output: [
    { key: "id", type: "number", label: "New custom field ID" },
    { key: "location", type: "string", label: "URL of the new custom field" },
  ],

  async execute(input, ctx) {
    const res = await new AweberClient(ctx).raw(
      `/accounts/${encodeId(input.accountId)}/lists/${encodeId(input.listId)}/custom_fields`,
      { method: "POST", body: { name: input.name, "ws.op": "create" } },
    );
    const location = res.headers.get("location");
    return { id: locationId(location), location: location ?? undefined };
  },
};

export default customFieldCreate;
