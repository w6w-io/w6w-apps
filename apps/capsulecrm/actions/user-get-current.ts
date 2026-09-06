import type { ActionDefinition } from "@w6w/types";
import { CapsuleClient } from "../lib/client.ts";

interface Input {
  embed?: string[];
}

/**
 * `GET /users/current` — the user this API token belongs to. Never echoes
 * the token itself (unlike a vendor "whoami" that dumps the caller's own
 * key), which is also why the auth `test` hook uses this same endpoint.
 */
const userGetCurrent: ActionDefinition<Input> = {
  key: "user-get-current",
  type: "read",
  resource: "user",
  title: "Get Current User",
  description: "Show the user this API token is associated with.",
  requiresAuth: true,
  params: [
    {
      key: "embed",
      label: "Embed",
      type: "multiselect",
      advanced: true,
      options: [{ value: "party", label: "User's own party record" }],
    },
  ],
  output: [{ key: "user", type: "object", label: "User" }],

  async execute(input, ctx) {
    const { data } = await new CapsuleClient(ctx).request<{ user: unknown }>("/users/current", {
      query: { embed: input.embed?.join(",") },
    });
    return { user: data.user };
  },
};

export default userGetCurrent;
