import type { ActionDefinition } from "@w6w/types";
import { LumaClient } from "../lib/client.ts";

/** `GET /v1/users/get-self` — the identity behind the connected calendar key. */
type Input = Record<string, never>;

const userGetSelf: ActionDefinition<Input> = {
  key: "user-get-self",
  type: "read",
  resource: "user",
  title: "Get Current User",
  description: "Return the Luma account that owns the connected calendar API key.",
  params: [],
  output: [
    { key: "id", type: "string", label: "User ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "email", type: "string", label: "Email" },
    { key: "avatar_url", type: "string", label: "Avatar URL" },
    { key: "first_name", type: "string", label: "First name" },
    { key: "last_name", type: "string", label: "Last name" },
  ],

  execute(_input, ctx) {
    return new LumaClient(ctx).json("/v1/users/get-self");
  },
};

export default userGetSelf;
