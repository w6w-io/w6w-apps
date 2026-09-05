import type { ActionDefinition } from "@w6w/types";
import { TextMagicClient } from "../lib/client.ts";

/** `DELETE /api/v2/messages/{id}` — answers `204` with no body on success. */
interface Input {
  id: number;
}

const messageDelete: ActionDefinition<Input> = {
  key: "message-delete",
  type: "perform",
  resource: "message",
  title: "Delete Message",
  description: "Delete one outbound message record.",
  idempotent: true,
  params: [{ key: "id", label: "Message ID", type: "number", required: true }],
  output: [{ key: "status", type: "number", label: "HTTP status (204 on success)" }],

  async execute(input, ctx) {
    const status = await new TextMagicClient(ctx).status(
      `/messages/${encodeURIComponent(input.id)}`,
      { method: "DELETE" },
    );
    return { status };
  },
};

export default messageDelete;
