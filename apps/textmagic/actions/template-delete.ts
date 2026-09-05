import type { ActionDefinition } from "@w6w/types";
import { TextMagicClient } from "../lib/client.ts";

/** `DELETE /api/v2/templates/{id}` — answers `204` with no body on success. */
interface Input {
  id: number;
}

const templateDelete: ActionDefinition<Input> = {
  key: "template-delete",
  type: "perform",
  resource: "template",
  title: "Delete Template",
  description: "Delete a message template.",
  idempotent: true,
  params: [{ key: "id", label: "Template ID", type: "number", required: true }],
  output: [{ key: "status", type: "number", label: "HTTP status (204 on success)" }],

  async execute(input, ctx) {
    const status = await new TextMagicClient(ctx).status(
      `/templates/${encodeURIComponent(input.id)}`,
      { method: "DELETE" },
    );
    return { status };
  },
};

export default templateDelete;
