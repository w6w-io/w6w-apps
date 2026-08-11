import type { ActionDefinition } from "@w6w/types";
import { EmailOctopusClient, seg } from "../lib/client.ts";

interface Input {
  listId: string;
  tag: string;
}

/** `DELETE /lists/{list_id}/fields/{tag}` — 204, no body. */
const deleteField: ActionDefinition<Input> = {
  key: "delete-field",
  type: "perform",
  resource: "field",
  title: "Delete Field",
  description:
    "Remove a custom field definition from a list, addressed by its tag. The stored values for that field on every contact go with it. Returns 204 with no body.",
  idempotent: true,
  params: [
    {
      key: "listId",
      label: "List ID",
      type: "string",
      required: true,
      placeholder: "00000000-0000-0000-0000-000000000000",
    },
    {
      key: "tag",
      label: "Tag",
      type: "string",
      required: true,
      hint: "The field's tag, not its label.",
    },
  ],
  output: [{ key: "deleted", type: "boolean", label: "Always true when the call succeeded" }],

  async execute(input, ctx) {
    await new EmailOctopusClient(ctx).request(
      `/lists/${seg(input.listId)}/fields/${seg(input.tag)}`,
      { method: "DELETE" },
    );
    return { deleted: true };
  },
};

export default deleteField;
