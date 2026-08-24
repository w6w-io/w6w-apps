import type { ActionDefinition } from "@w6w/types";
import { GrainClient } from "../lib/client.ts";

interface Output {
  users: unknown[];
}

/**
 * `POST /_/public-api/v2/users` — the workspace's users
 * (`{ id, name, email }` each). No params, no pagination documented.
 */
const userList: ActionDefinition<Record<string, never>, Output> = {
  key: "user-list",
  type: "search",
  resource: "user",
  title: "List Users",
  description: "List the workspace's users.",
  params: [],
  output: [{ key: "users", type: "array", label: "Users (id, name, email)" }],

  async execute(_input, ctx) {
    const result = await new GrainClient(ctx).request<{ users?: unknown[] }>("/v2/users", {
      method: "POST",
      body: {},
    });
    return { users: result?.users ?? [] };
  },
};

export default userList;
