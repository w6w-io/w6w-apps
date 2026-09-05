import type { ActionDefinition } from "@w6w/types";
import { JiraDcClient, unset } from "../lib/client.ts";

interface Input {
  username?: string;
  key?: string;
}

const userGet: ActionDefinition<Input> = {
  key: "user-get",
  type: "read",
  resource: "user",
  title: "Get User",
  description: "Look up a single user by username or by their internal key.",
  params: [
    {
      key: "username",
      label: "Username",
      type: "string",
      row: "who",
      hint: "The account's login username.",
    },
    {
      key: "key",
      label: "User key",
      type: "string",
      row: "who",
      hint: "Data Center's stable internal user id — use this instead of username for an " +
        "account that may be renamed.",
    },
  ],
  output: [
    { key: "name", type: "string", label: "Username" },
    { key: "key", type: "string", label: "User key" },
    { key: "displayName", type: "string", label: "Display name" },
    { key: "emailAddress", type: "string", label: "Email" },
  ],

  execute(input, ctx) {
    if (!unset(input.username) && !unset(input.key)) {
      throw new Error("provide either a username or a user key");
    }
    return new JiraDcClient(ctx).request("/user", {
      query: { username: unset(input.username), key: unset(input.key) },
    });
  },
};

export default userGet;
