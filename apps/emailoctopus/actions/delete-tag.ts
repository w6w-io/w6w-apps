import type { ActionDefinition } from "@w6w/types";
import { EmailOctopusClient, seg } from "../lib/client.ts";

interface Input {
  listId: string;
  tag: string;
}

/** `DELETE /lists/{list_id}/tags/{tag}` — 204, no body. Detaches it from every contact. */
const deleteTag: ActionDefinition<Input> = {
  key: "delete-tag",
  type: "perform",
  resource: "tag",
  title: "Delete Tag",
  description:
    "Delete a tag from a list. It is removed from every contact carrying it. Returns 204 with no body.",
  idempotent: true,
  params: [
    {
      key: "listId",
      label: "List ID",
      type: "string",
      required: true,
      placeholder: "00000000-0000-0000-0000-000000000000",
    },
    { key: "tag", label: "Tag", type: "string", required: true },
  ],
  output: [{ key: "deleted", type: "boolean", label: "Always true when the call succeeded" }],

  async execute(input, ctx) {
    await new EmailOctopusClient(ctx).request(
      `/lists/${seg(input.listId)}/tags/${seg(input.tag)}`,
      { method: "DELETE" },
    );
    return { deleted: true };
  },
};

export default deleteTag;
