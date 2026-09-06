import type { ActionDefinition } from "@w6w/types";
import { LivestormClient } from "../lib/client.ts";

interface Input {
  id: string;
  email: string;
}

const sessionPersonRemoveByEmail: ActionDefinition<Input> = {
  key: "session-person-remove-by-email",
  type: "perform",
  resource: "session",
  title: "Remove Session Person by Email",
  description: "Remove a participant from a session, identified by email address.",
  idempotent: true,
  params: [
    { key: "id", label: "Session ID", type: "string", required: true },
    { key: "email", label: "Email", type: "string", required: true },
  ],
  output: [{ key: "status", type: "number", label: "HTTP status" }],

  async execute(input, ctx) {
    const status = await new LivestormClient(ctx).status(
      `/sessions/${encodeURIComponent(input.id)}/people`,
      { method: "DELETE", query: { "filter[email]": input.email } },
    );
    return { status };
  },
};

export default sessionPersonRemoveByEmail;
