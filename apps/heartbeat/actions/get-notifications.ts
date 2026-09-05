import type { ActionDefinition } from "@w6w/types";
import { HeartbeatClient } from "../lib/client.ts";

/** `GET /v0/notifications?email=` — how many pending notifications a member has. */
interface Input {
  email: string;
}

const getNotifications: ActionDefinition<Input> = {
  key: "get-notifications",
  type: "read",
  resource: "notification",
  title: "Get Notification Count",
  description: "Get the number of pending notifications a specific member has.",
  params: [{ key: "email", label: "Email", type: "string", required: true }],
  output: [{ key: "count", type: "number", label: "Pending notification count" }],

  execute(input, ctx) {
    return new HeartbeatClient(ctx).json("/notifications", { query: { email: input.email } });
  },
};

export default getNotifications;
