import type { ActionDefinition } from "@w6w/types";
import { JustCallClient } from "../lib/client.ts";

/** `GET /v2.1/users/{id}` — verified against `users_get_v21`'s OpenAPI fragment, 2026-09-05. */
interface Input {
  id: string | number;
}

const userGet: ActionDefinition<Input> = {
  key: "user-get",
  type: "read",
  resource: "user",
  title: "Get User",
  description: "Fetch data for a specific user (agent_id can be found via the List Users action).",
  params: [
    { key: "id", label: "Agent ID", type: "string", required: true },
  ],
  output: [
    { key: "id", type: "number", label: "Agent ID" },
    { key: "name", type: "string", label: "Full name" },
    { key: "email", type: "string", label: "Email" },
    { key: "role", type: "string", label: "Role" },
    { key: "available", type: "string", label: "Yes/No — current availability" },
    { key: "on_call", type: "string", label: "Yes/No — currently on a call" },
    { key: "owned_numbers", type: "array", label: "Numbers assigned uniquely to this user" },
    { key: "shared_numbers", type: "array", label: "Numbers shared with this user" },
    { key: "groups", type: "array", label: "User groups this user is a member of" },
  ],

  async execute(input, ctx) {
    const client = new JustCallClient(ctx);
    return await client.data(`/users/${encodeURIComponent(String(input.id))}`);
  },
};

export default userGet;
