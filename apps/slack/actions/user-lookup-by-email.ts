import type { ActionDefinition } from "@w6w/types";
import { SlackClient } from "../lib/client.ts";

interface Input {
  email: string;
}

const userLookupByEmail: ActionDefinition<Input> = {
  key: "user-lookup-by-email",
  type: "read",
  resource: "user",
  title: "Lookup User by Email",
  description: "Finds a user by their registered email address (users.lookupByEmail).",
  params: [
    { key: "email", label: "Email", type: "string", required: true },
  ],

  async execute(input, ctx) {
    const client = new SlackClient(ctx);
    const res = await client.request<{ user?: unknown }>("/users.lookupByEmail", {
      query: { email: input.email },
    });
    return res.user ?? res;
  },
};

export default userLookupByEmail;
