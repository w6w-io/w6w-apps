import type { ActionDefinition } from "@w6w/types";
import { TextMagicClient } from "../lib/client.ts";

/** `DELETE /api/v2/lists/{id}` — answers `204` with no body on success. */
interface Input {
  id: number;
}

const listDelete: ActionDefinition<Input> = {
  key: "list-delete",
  type: "perform",
  resource: "list",
  title: "Delete List",
  description: "Delete a contact list. Does not delete the contacts in it.",
  idempotent: true,
  params: [{ key: "id", label: "List ID", type: "number", required: true }],
  output: [{ key: "status", type: "number", label: "HTTP status (204 on success)" }],

  async execute(input, ctx) {
    const status = await new TextMagicClient(ctx).status(
      `/lists/${encodeURIComponent(input.id)}`,
      { method: "DELETE" },
    );
    return { status };
  },
};

export default listDelete;
