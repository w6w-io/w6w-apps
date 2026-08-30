import type { ActionDefinition } from "@w6w/types";
import { UnbounceClient } from "../lib/client.ts";

const userGetSelf: ActionDefinition = {
  key: "user-get-self",
  type: "read",
  resource: "user",
  title: "Get Current User",
  description: "Retrieve the user this connection authenticates as, and the accounts they can see.",
  output: [
    { key: "id", type: "string", label: "User ID" },
    { key: "first_name", type: "string", label: "First name" },
    { key: "last_name", type: "string", label: "Last name" },
    { key: "email", type: "string", label: "Email" },
  ],

  execute(_input, ctx) {
    return new UnbounceClient(ctx).get("/users/self");
  },
};

export default userGetSelf;
