import type { ActionDefinition } from "@w6w/types";
import { ReplyClient } from "../lib/client.ts";
import { sequenceIdParam } from "../lib/params.ts";

/**
 * `GET /v3/sequences/{id}` — one sequence in full: name, status, owner,
 * schedule, settings, connected accounts, and its complete step list. Requires
 * `sequences:read`.
 */
interface Input {
  id: number;
}

const sequenceGet: ActionDefinition<Input> = {
  key: "sequence-get",
  type: "read",
  resource: "sequence",
  title: "Get Sequence",
  description: "Fetch one sequence in full, including its schedule, connected accounts, and steps.",
  params: [sequenceIdParam],
  output: [
    { key: "id", type: "number", label: "Sequence ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "status", type: "string", label: "new | active | paused" },
    { key: "health", type: "string", label: "healthy | stalled | degraded | blocked" },
    { key: "isArchived", type: "boolean", label: "Archived" },
    { key: "steps", type: "array", label: "Steps" },
  ],

  execute(input, ctx) {
    return new ReplyClient(ctx).json(`/sequences/${input.id}`);
  },
};

export default sequenceGet;
