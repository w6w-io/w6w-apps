import type { ActionDefinition } from "@w6w/types";
import { LawmaticsClient, type LawmaticsListEnvelope } from "../lib/client.ts";

/**
 * `GET /v1/users` — the firm's Users. Mainly useful for resolving the User
 * IDs `create-task`/`create-event` accept for assignment/hosting.
 */
const listUsers: ActionDefinition<Record<string, never>> = {
  key: "list-users",
  type: "read",
  resource: "user",
  title: "List Users",
  description:
    "List the firm's Lawmatics Users — useful for resolving IDs to assign Tasks/Events to.",
  params: [],
  output: [
    { key: "data", type: "array", label: "Users" },
  ],

  async execute(_input, ctx) {
    return await new LawmaticsClient(ctx).request<LawmaticsListEnvelope>("/users");
  },
};

export default listUsers;
