import type { ActionDefinition } from "@w6w/types";
import { HeartbeatClient } from "../lib/client.ts";

/** `GET /v0/users/{userID}` — a single member's full profile. */
interface Input {
  userID: string;
}

const getUser: ActionDefinition<Input> = {
  key: "get-user",
  type: "read",
  resource: "user",
  title: "Get User",
  description: "Fetch a single Heartbeat community member by id.",
  params: [{ key: "userID", label: "User ID", type: "string", required: true }],
  output: [
    { key: "id", type: "string", label: "User ID" },
    { key: "email", type: "string", label: "Email" },
    { key: "name", type: "string", label: "Full name" },
    { key: "role", type: "string", label: "Current role name" },
    { key: "isAdmin", type: "boolean", label: "Is an administrator" },
    { key: "groups", type: "array", label: "Groups — [{id, name}]" },
    { key: "bio", type: "string", label: "Bio" },
    { key: "avatar", type: "string", label: "Avatar image URL" },
  ],

  execute(input, ctx) {
    return new HeartbeatClient(ctx).json(`/users/${encodeURIComponent(input.userID)}`);
  },
};

export default getUser;
