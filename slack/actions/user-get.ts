import type { ActionDefinition } from "@w6w/types";
import { SlackClient } from "../lib/client.ts";

interface Input {
  user: string;
  includeLocale?: boolean;
}

const userGet: ActionDefinition<Input> = {
  key: "user-get",
  type: "read",
  resource: "user",
  title: "Get User",
  description: "Retrieves user profile information (users.info).",
  params: [
    { key: "user", label: "User ID", type: "string", required: true },
    { key: "includeLocale", label: "Include locale", type: "boolean" },
  ],

  async execute(input, ctx) {
    const client = new SlackClient(ctx);
    const res = await client.request<{ user?: unknown }>("/users.info", {
      query: { user: input.user, include_locale: input.includeLocale },
    });
    return res.user ?? res;
  },
};

export default userGet;
