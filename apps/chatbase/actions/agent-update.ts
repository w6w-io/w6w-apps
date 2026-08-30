import type { ActionDefinition } from "@w6w/types";
import { ChatbaseClient, compact } from "../lib/client.ts";
import { agentIdParam } from "../lib/params.ts";

/**
 * `PUT /agents/{agentId}` — partial update; only provided fields change.
 * Answers `{"success": true}`, not the updated agent — call Get Agent to
 * read it back.
 *
 * `channelInstructions` (per-channel prompt overrides) is left out: it is a
 * deeply nested, per-channel object (`chat_widget`, `slack`, `whatsapp`, …,
 * each itself `string | {chat, voice}`) that does not reduce to a small set
 * of form fields without inventing a shape Chatbase doesn't document as a
 * single unit. `name` and `instructions` cover the common case.
 */
interface Input {
  agentId: string;
  name?: string;
  instructions?: string;
}

const agentUpdate: ActionDefinition<Input> = {
  key: "agent-update",
  type: "perform",
  resource: "agent",
  title: "Update Agent",
  description: "Partially update an agent's name and/or instructions. Only provided fields change.",
  idempotent: true,
  params: [
    agentIdParam,
    { key: "name", label: "Name", type: "string", validation: { maxLength: 100 } },
    {
      key: "instructions",
      label: "Instructions",
      type: "text",
      hint: "System prompt for the agent.",
    },
  ],
  output: [{ key: "success", type: "boolean", label: "Whether the update was applied" }],

  execute(input, ctx) {
    return new ChatbaseClient(ctx).request(`/agents/${encodeURIComponent(input.agentId)}`, {
      method: "PUT",
      body: compact({ name: input.name, instructions: input.instructions }),
    });
  },
};

export default agentUpdate;
