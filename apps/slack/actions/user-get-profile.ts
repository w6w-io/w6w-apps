import type { ActionDefinition } from "@w6w/types";
import { SlackClient } from "../lib/client.ts";

interface Input {
  user: string;
  includeLabels?: boolean;
}

const userGetProfile: ActionDefinition<Input> = {
  key: "user-get-profile",
  type: "read",
  resource: "user",
  title: "Get User Profile",
  description: "Retrieves a user profile (users.profile.get).",
  params: [
    { key: "user", label: "User ID", type: "string", required: true },
    { key: "includeLabels", label: "Include labels", type: "boolean" },
  ],

  async execute(input, ctx) {
    const client = new SlackClient(ctx);
    const res = await client.request<{ profile?: unknown }>("/users.profile.get", {
      query: { user: input.user, include_labels: input.includeLabels },
    });
    return res.profile ?? res;
  },
};

export default userGetProfile;
