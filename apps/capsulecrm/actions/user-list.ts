import type { ActionDefinition } from "@w6w/types";
import { CapsuleClient } from "../lib/client.ts";

interface Input {
  embed?: string[];
}

const userList: ActionDefinition<Input> = {
  key: "user-list",
  type: "read",
  resource: "user",
  title: "List Users",
  description: "List every user on the Capsule account — useful for resolving owner/team ids.",
  params: [
    {
      key: "embed",
      label: "Embed",
      type: "multiselect",
      advanced: true,
      options: [{ value: "party", label: "User's own party record" }],
    },
  ],
  output: [{ key: "users", type: "array", label: "Users" }],

  async execute(input, ctx) {
    const { data } = await new CapsuleClient(ctx).request<{ users: unknown[] }>("/users", {
      query: { embed: input.embed?.join(",") },
    });
    return { users: data.users };
  },
};

export default userList;
