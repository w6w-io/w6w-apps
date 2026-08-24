import type { ActionDefinition } from "@w6w/types";
import { ClioClient } from "../lib/client.ts";
import { fieldsParam } from "../lib/params.ts";

/**
 * `GET /users/who_am_i.json` — the same endpoint the `oauth2*` Auth methods
 * use for `test`/`afterConnect`, exposed here as an ordinary Action so a
 * workflow can read the connected user's own id/name/roles without a
 * separate `users.json` lookup.
 */
interface Input {
  fields?: string;
}

const userWhoAmI: ActionDefinition<Input> = {
  key: "user-who-am-i",
  type: "read",
  resource: "user",
  title: "Get Current User",
  description: "Fetch the user this connection authenticates as.",
  params: [
    fieldsParam("id,etag,name,email,first_name,last_name,roles,time_zone,subscription_type"),
  ],
  output: [{ key: "data", type: "object", label: "The current user" }],

  execute(input, ctx) {
    return new ClioClient(ctx).data("/users/who_am_i.json", {
      query: { fields: input.fields },
    });
  },
};

export default userWhoAmI;
