import type { ActionDefinition } from "@w6w/types";
import { stripSecrets, VapiClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

/**
 * `DELETE /assistant/{id}`.
 *
 * If this Assistant is currently pinned as a phone number's inbound handler,
 * Vapi refuses with a `409` carrying `{"error": "assistant_pinned", "message":
 * "..."}` rather than the usual `{"error": "Conflict", ...}` — unpin the
 * phone number first. `formatVapiError` (`lib/client.ts`) surfaces that
 * message verbatim, since it names the reason directly.
 */
interface Input {
  id: string;
}

const assistantDelete: ActionDefinition<Input> = {
  key: "assistant-delete",
  type: "perform",
  resource: "assistant",
  title: "Delete Assistant",
  description: "Delete an Assistant. Fails if it is pinned to a phone number.",
  idempotent: true,
  params: [idParam("Assistant ID")],
  output: [
    { key: "id", type: "string", label: "Assistant ID" },
    { key: "name", type: "string", label: "Name" },
  ],

  async execute(input, ctx) {
    const deleted = await new VapiClient(ctx).json(
      `/assistant/${encodeURIComponent(input.id)}`,
      { method: "DELETE" },
    );
    return stripSecrets(deleted);
  },
};

export default assistantDelete;
