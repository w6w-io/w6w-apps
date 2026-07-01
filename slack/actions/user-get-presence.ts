import type { ActionDefinition } from "@w6w/types";
import { SlackClient } from "../lib/client.ts";

interface Input {
  user: string;
}

const userGetPresence: ActionDefinition<Input> = {
  key: "user-get-presence",
  type: "read",
  resource: "user",
  title: "Get User Presence",
  description: "Reads a user's presence status (users.getPresence).",
  params: [
    { key: "user", label: "User ID", type: "string", required: true },
  ],

  async execute(input, ctx) {
    const client = new SlackClient(ctx);
    return client.request("/users.getPresence", { query: { user: input.user } });
  },
};

export default userGetPresence;
